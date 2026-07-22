// Étape post-build : à partir du dist/index.html généré par Vite (qui contient
// déjà les balises JS/CSS hashées), génère un fichier HTML statique par article
// publié — avec <head> SEO complet (title, description, Open Graph, canonical,
// JSON-LD) et le contenu de l'article injecté dans le body. Régénère aussi le
// sitemap. Netlify sert ces fichiers aux bots comme aux humains ; la SPA reprend
// la main au chargement.
//
// Ne fait JAMAIS échouer le build : en cas d'erreur réseau, on émet au moins le
// sitemap des routes statiques et on laisse le dist tel quel.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { marked } from 'marked'
import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'
import { CARD_SYMBOLS, escapeAttr, escapeHtml, jsonLdScript, urlEntry } from './lib/prerender.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const distDir = resolve(root, 'dist')

/** Charge un fichier .env dans process.env sans écraser l'existant. */
function loadDotEnv(file) {
  const path = resolve(root, file)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match) continue
    const key = match[1]
    let value = (match[2] ?? '').trim()
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

loadDotEnv('.env')

const SITE_URL = (process.env.VITE_SITE_URL || 'https://bluedex.fr').replace(/\/$/, '')
const SITE_NAME = 'BlueDex'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

// --- Rendu markdown (miroir Node de src/lib/markdown.ts) ------------------
// CARD_SYMBOLS vit dans ./lib/prerender.mjs et est vérifié synchro avec
// src/lib/cardSymbols.ts par prerender.spec.mjs.
const SYMBOL_PATTERN = /:([a-z0-9_-]+):/gi
const purify = DOMPurify(new JSDOM('').window)

function replaceCardSymbols(html) {
  return html.replace(SYMBOL_PATTERN, (match, key) => {
    const src = CARD_SYMBOLS[key.toLowerCase()]
    if (!src) return match
    return `<img src="${src}" alt="${key}" class="inline-block h-5 w-5 -translate-y-0.5 align-middle" />`
  })
}

// La page article a déjà un <h1> (le titre) : on dégrade tout H1 du contenu en
// H2 pour éviter deux H1 sur la page (anti-pattern SEO).
function demoteHeadings(html) {
  return html.replace(/<(\/?)h1(\s[^>]*)?>/gi, '<$1h2$2>')
}

function renderMarkdown(source) {
  const html = marked.parse(source ?? '', { async: false })
  return purify.sanitize(demoteHeadings(replaceCardSymbols(html)))
}

function absoluteUrl(path) {
  if (!path) return SITE_URL
  if (/^https?:\/\//.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}
function cdnImage(url, width) {
  if (!url || !/^https?:\/\//.test(url)) return url
  const params = new URLSearchParams({ url })
  if (width) params.set('w', String(width))
  return `${SITE_URL}/.netlify/images?${params.toString()}`
}

// --- Récupération des données --------------------------------------------
async function fetchPublishedArticles() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[postbuild] Env Supabase absente — prerender des articles ignoré.')
    return []
  }
  return supabaseGet(
    'articles?status=eq.published&select=slug,title,excerpt,content,cover_image_url,published_at,created_at&order=published_at.desc',
  )
}

async function fetchSets() {
  return supabaseGet('sets?select=slug,name,symbol_url,card_count,release_date&order=release_date.desc')
}

async function fetchPublicDecks() {
  return supabaseGet(
    'decks?is_public=eq.true&select=id,name,format,updated_at,cover_card:cards!cover_card_id(image_url,name),author:profiles(display_name),deck_cards(quantity,card:cards(name,number,set:sets(slug)))&order=updated_at.desc',
  )
}

const DECK_FORMAT_LABELS = { normal: 'Normal', rapide: 'Rapide' }

async function fetchCardsWithSet() {
  // Une carte est identifiée par (slug du set, numéro).
  return supabaseGet('cards?select=number,name,image_url,rarity,type,faction,effect,set:sets(slug,name,symbol_url)')
}

async function supabaseGet(path) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[postbuild] Env Supabase absente — récupération ignorée.')
    return []
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status} ${res.statusText}`)
  return res.json()
}

// --- Construction du <head> SEO ------------------------------------------
function buildHead({ title, titleOverride, description, canonical, image, type = 'website', publishedTime, jsonLd }) {
  // titleOverride : titre complet tel quel (sans suffixe « · BlueDex »), utile
  // pour la home. Sinon : « <title> · BlueDex », ou juste « BlueDex ».
  const fullTitle = titleOverride || (title ? `${title} · ${SITE_NAME}` : SITE_NAME)
  const socialTitle = titleOverride || title || SITE_NAME
  const desc = description || ''
  const img = image || DEFAULT_OG_IMAGE
  const tags = [
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<meta property="og:site_name" content="${escapeAttr(SITE_NAME)}" />`,
    `<meta property="og:type" content="${escapeAttr(type)}" />`,
    `<meta property="og:title" content="${escapeAttr(socialTitle)}" />`,
    `<meta property="og:description" content="${escapeAttr(desc)}" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(img)}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(socialTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(desc)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(img)}" />`,
  ]
  if (publishedTime) tags.push(`<meta property="article:published_time" content="${escapeAttr(publishedTime)}" />`)
  if (jsonLd) tags.push(jsonLdScript(jsonLd))
  return { fullTitle, description: desc, tags: tags.join('\n    ') }
}

/**
 * Applique un <head> SEO + un body pré-rendu à un template dist/index.html.
 * Remplace <title> et <meta description>, injecte les balises avant </head>,
 * et le contenu dans #app.
 */
function applyToTemplate(template, { fullTitle, description, tags }, bodyHtml) {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeAttr(description)}" />`)
    .replace('</head>', `    ${tags}\n  </head>`)
  if (bodyHtml) {
    html = html.replace('<div id="app"></div>', `<div id="app">${bodyHtml}</div>`)
  }
  return html
}

function homeBody() {
  return [
    '<main>',
    '<h1>BlueDex — Base de données et deck builder Blue Rising</h1>',
    '<h2>À propos de BlueDex</h2>',
    '<p>BlueDex est la base de données communautaire dédiée à Blue Rising, le jeu de cartes à collectionner (TCG) porté par la Karmine Corp et Kameto. Retrouve l’intégralité des sets et des cartes du jeu, avec leurs effets, factions et raretés, dans une interface pensée pour les joueurs et les collectionneurs.</p>',
    '<p>Notre deck builder te permet de construire tes decks Blue Rising, de les partager avec la communauté et de t’inspirer des créations des autres joueurs. Suis aussi l’actualité du jeu, nouvelles cartes, factions et stratégies, dans notre rubrique articles.</p>',
    '<p><a href="/sets">Tous les sets</a> · <a href="/decks">Deck builder</a> · <a href="/actus">Articles</a></p>',
    '</main>',
  ].join('\n')
}

function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon-512.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'fr-FR',
      },
    ],
  }
}

function articleBody(article, contentHtml) {
  const date = article.published_at ?? article.created_at
  const dateLabel = date
    ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const cover = article.cover_image_url
    ? `<img src="${escapeAttr(cdnImage(article.cover_image_url, 800))}" alt="${escapeAttr(article.title)}" />`
    : ''
  return [
    '<article>',
    date ? `<p><time datetime="${escapeAttr(date)}">${escapeHtml(dateLabel)}</time></p>` : '',
    `<h1>${escapeHtml(article.title)}</h1>`,
    cover,
    contentHtml,
    '</article>',
  ]
    .filter(Boolean)
    .join('\n')
}

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  }
}

function setBody(set, cards) {
  const links = cards
    .map(
      (c) =>
        `<li><a href="/sets/${escapeAttr(set.slug)}/cards/${escapeAttr(c.number)}">${escapeHtml(c.name)} · #${escapeHtml(c.number)}</a></li>`,
    )
    .join('\n')
  return [
    '<main>',
    `<h1>${escapeHtml(set.name)}</h1>`,
    `<p>Toutes les cartes du set ${escapeHtml(set.name)} de Blue Rising.</p>`,
    cards.length ? `<ul>\n${links}\n</ul>` : '',
    '</main>',
  ]
    .filter(Boolean)
    .join('\n')
}

function cardBody(card, setName) {
  const img = card.image_url
    ? `<img src="${escapeAttr(cdnImage(card.image_url, 600))}" alt="${escapeAttr(card.name)}" />`
    : ''
  const meta = [card.type, card.faction, card.rarity].filter(Boolean).map(escapeHtml).join(' · ')
  return [
    '<main>',
    img,
    `<h1>${escapeHtml(card.name)}</h1>`,
    `<p>${escapeHtml(setName)} · #${escapeHtml(card.number)}</p>`,
    meta ? `<p>${meta}</p>` : '',
    card.effect ? `<p>${escapeHtml(card.effect)}</p>` : '',
    '</main>',
  ]
    .filter(Boolean)
    .join('\n')
}

function deckBody(deck) {
  const author = deck.author?.display_name
  const cards = (deck.deck_cards ?? [])
    .map((dc) => ({ q: dc.quantity, name: dc.card?.name, number: dc.card?.number, slug: dc.card?.set?.slug }))
    .filter((c) => c.name)
  const list = cards
    .map((c) => {
      const label = `${c.q}× ${escapeHtml(c.name)}`
      return c.slug && c.number
        ? `<li><a href="/sets/${escapeAttr(c.slug)}/cards/${escapeAttr(c.number)}">${label}</a></li>`
        : `<li>${label}</li>`
    })
    .join('\n')
  return [
    '<main>',
    `<h1>${escapeHtml(deck.name)}</h1>`,
    `<p>Deck ${escapeHtml(DECK_FORMAT_LABELS[deck.format] ?? deck.format)} Blue Rising${author ? ` par ${escapeHtml(author)}` : ''}.</p>`,
    cards.length ? `<h2>Liste des cartes</h2>\n<ul>\n${list}\n</ul>` : '',
    '</main>',
  ]
    .filter(Boolean)
    .join('\n')
}

function writeHtml(routePath, html) {
  const file = resolve(distDir, `${routePath.replace(/^\//, '')}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

// --- Sitemap --------------------------------------------------------------
const staticRoutes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/sets', changefreq: 'weekly', priority: '0.8' },
  { path: '/decks', changefreq: 'weekly', priority: '0.6' },
  { path: '/actus', changefreq: 'daily', priority: '0.8' },
  { path: '/mentions-legales', changefreq: 'yearly', priority: '0.2' },
  { path: '/confidentialite', changefreq: 'yearly', priority: '0.2' },
]

function writeSitemap({ articles, sets, cards, decks }) {
  const entries = [
    ...staticRoutes.map((r) =>
      urlEntry({ loc: `${SITE_URL}${r.path}`, changefreq: r.changefreq, priority: r.priority }),
    ),
    ...articles.map((a) =>
      urlEntry({
        loc: `${SITE_URL}/actus/${a.slug}`,
        lastmod: (a.published_at ?? a.created_at)?.slice(0, 10),
        changefreq: 'monthly',
        priority: '0.7',
      }),
    ),
    ...sets.map((s) => urlEntry({ loc: `${SITE_URL}/sets/${s.slug}`, changefreq: 'weekly', priority: '0.7' })),
    ...cards
      .filter((c) => c.set?.slug)
      .map((c) =>
        urlEntry({ loc: `${SITE_URL}/sets/${c.set.slug}/cards/${c.number}`, changefreq: 'monthly', priority: '0.5' }),
      ),
    ...decks.map((d) =>
      urlEntry({
        loc: `${SITE_URL}/decks/${d.id}`,
        lastmod: d.updated_at?.slice(0, 10),
        changefreq: 'weekly',
        priority: '0.5',
      }),
    ),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`
  writeFileSync(resolve(distDir, 'sitemap.xml'), xml)
  return entries.length
}

// --- Programme principal --------------------------------------------------
async function main() {
  const templatePath = resolve(distDir, 'index.html')
  if (!existsSync(templatePath)) {
    console.warn('[postbuild] dist/index.html introuvable — as-tu lancé vite build avant ? Abandon.')
    return
  }
  const template = readFileSync(templatePath, 'utf8')

  let articles = []
  let sets = []
  let cards = []
  let decks = []
  try {
    ;[articles, sets, cards, decks] = await Promise.all([
      fetchPublishedArticles(),
      fetchSets(),
      fetchCardsWithSet(),
      fetchPublicDecks(),
    ])
  } catch (err) {
    console.warn(`[postbuild] Récupération des données échouée (${err.message}) — on continue avec ce qu'on a.`)
  }

  let articleCount = 0
  for (const article of articles) {
    const canonical = `${SITE_URL}/actus/${article.slug}`
    const image = article.cover_image_url ? cdnImage(article.cover_image_url, 1200) : DEFAULT_OG_IMAGE
    const published = article.published_at ?? article.created_at
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.excerpt,
      image: article.cover_image_url ? [image] : undefined,
      datePublished: published,
      dateModified: published,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    }
    const head = buildHead({
      title: article.title,
      description: article.excerpt,
      canonical,
      image,
      type: 'article',
      publishedTime: published,
      jsonLd,
    })
    const body = articleBody(article, renderMarkdown(article.content))
    writeHtml(`/actus/${article.slug}`, applyToTemplate(template, head, body))
    articleCount++
  }

  // Regroupe les cartes par slug de set pour lister sur la page set.
  const cardsBySet = new Map()
  for (const card of cards) {
    const slug = card.set?.slug
    if (!slug) continue
    if (!cardsBySet.has(slug)) cardsBySet.set(slug, [])
    cardsBySet.get(slug).push(card)
  }

  let setCount = 0
  for (const set of sets) {
    const canonical = `${SITE_URL}/sets/${set.slug}`
    const setCards = cardsBySet.get(set.slug) ?? []
    const head = buildHead({
      title: set.name,
      description: `Les ${set.card_count ?? setCards.length} cartes du set ${set.name} de Blue Rising : liste complète, filtres et détails.`,
      canonical,
      image: set.symbol_url ? absoluteUrl(set.symbol_url) : DEFAULT_OG_IMAGE,
      jsonLd: breadcrumbLd([
        { name: 'Accueil', path: '/' },
        { name: 'Sets', path: '/sets' },
        { name: set.name, path: `/sets/${set.slug}` },
      ]),
    })
    writeHtml(`/sets/${set.slug}`, applyToTemplate(template, head, setBody(set, setCards)))
    setCount++
  }

  let cardCount = 0
  for (const card of cards) {
    const set = card.set
    if (!set?.slug) continue
    const canonical = `${SITE_URL}/sets/${set.slug}/cards/${card.number}`
    const details = [card.type, card.faction, card.rarity].filter(Boolean).join(', ')
    const head = buildHead({
      title: `${card.name} · ${set.name}`,
      description: `${card.name} (#${card.number})${details ? ` — ${details}` : ''} du set ${set.name} de Blue Rising.`,
      canonical,
      image: card.image_url ? cdnImage(card.image_url, 800) : DEFAULT_OG_IMAGE,
      jsonLd: breadcrumbLd([
        { name: 'Accueil', path: '/' },
        { name: 'Sets', path: '/sets' },
        { name: set.name, path: `/sets/${set.slug}` },
        { name: card.name, path: `/sets/${set.slug}/cards/${card.number}` },
      ]),
    })
    writeHtml(`/sets/${set.slug}/cards/${card.number}`, applyToTemplate(template, head, cardBody(card, set.name)))
    cardCount++
  }

  let deckCount = 0
  for (const deck of decks) {
    const canonical = `${SITE_URL}/decks/${deck.id}`
    const author = deck.author?.display_name
    const cardTotal = (deck.deck_cards ?? []).reduce((sum, dc) => sum + (dc.quantity ?? 0), 0)
    const head = buildHead({
      title: `${deck.name} — Deck Blue Rising`,
      description: `Deck ${DECK_FORMAT_LABELS[deck.format] ?? deck.format} Blue Rising${author ? ` par ${author}` : ''} — ${cardTotal} cartes. Découvre la liste complète sur BlueDex.`,
      canonical,
      image: deck.cover_card?.image_url ? cdnImage(deck.cover_card.image_url, 800) : DEFAULT_OG_IMAGE,
      jsonLd: breadcrumbLd([
        { name: 'Accueil', path: '/' },
        { name: 'Deck Builder', path: '/decks' },
        { name: deck.name, path: `/decks/${deck.id}` },
      ]),
    })
    writeHtml(`/decks/${deck.id}`, applyToTemplate(template, head, deckBody(deck)))
    deckCount++
  }

  // Pages statiques : la home est réécrite dans dist/index.html (qui sert aussi
  // de fallback SPA), les autres en fichiers plats. Cela donne à ces routes de
  // vraies balises OG dans le HTML servi aux bots (Discord/Twitter).
  const staticPages = [
    {
      path: '/',
      title: 'Base de données et deck builder Blue Rising',
      description:
        'BlueDex : la base de données et le deck builder communautaires du TCG Blue Rising (Karmine Corp). Parcours tous les sets et cartes, construis tes decks et suis l’actu du jeu.',
      body: homeBody(),
      jsonLd: siteJsonLd(),
    },
    {
      path: '/actus',
      title: 'Actus',
      description: 'Cartes, factions, decks : les derniers articles et actualités autour de Blue Rising.',
    },
    {
      path: '/sets',
      title: 'Tous les sets Blue Rising',
      description: 'Tous les sets de Blue Rising : parcours les cartes, filtre-les et prépare tes decks.',
    },
    {
      path: '/decks',
      title: 'Deck Builder Blue Rising',
      description: 'Construis et explore des decks Blue Rising à partir de la base de cartes communautaire.',
    },
  ]

  let staticCount = 0
  for (const page of staticPages) {
    const canonical = page.path === '/' ? SITE_URL : `${SITE_URL}${page.path}`
    const head = buildHead({
      title: page.title,
      titleOverride: page.titleOverride,
      description: page.description,
      canonical,
      jsonLd: page.jsonLd,
    })
    const html = applyToTemplate(template, head, page.body)
    if (page.path === '/') writeFileSync(templatePath, html)
    else writeHtml(page.path, html)
    staticCount++
  }

  const sitemapCount = writeSitemap({ articles, sets, cards, decks })
  console.log(
    `[postbuild] pré-rendu : ${staticCount} page(s) statique(s), ${articleCount} article(s), ${setCount} set(s), ${cardCount} carte(s), ${deckCount} deck(s) — sitemap: ${sitemapCount} URLs.`,
  )
}

main().catch((err) => {
  // On ne casse jamais le build pour le SEO.
  console.warn(`[postbuild] Erreur inattendue : ${err.message}`)
})
