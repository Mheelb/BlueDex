// Supabase Edge Function: génère un article de blog sur Blue Rising avec Claude
// et l'enregistre en brouillon (status = 'draft') dans public.articles.
// Rien n'est publié automatiquement : la validation se fait à la main dans
// l'admin (/admin/articles).
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const ANTHROPIC_MODEL = 'claude-sonnet-5'

// Global fourni par le runtime Supabase Edge pour les tâches de fond.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOPIC_ANGLES = [
  'un coup de projecteur sur une carte précise (mécanique, synergies, dans quel deck la jouer)',
  "une présentation d'une des quatre factions (Émissaire, Veilleur, Gardien, Éclaireur) et de son identité de jeu",
  'un guide sur un archétype de deck possible avec les cartes existantes',
  'une comparaison entre plusieurs cartes de rareté proche',
  'un top 5 des cartes les plus intéressantes actuellement disponibles, avec justification',
  'des conseils pour un joueur débutant qui découvre Blue Rising',
  "un décryptage d'une mécanique de jeu (coût, puissance, soutien, effets) à travers des exemples de cartes",
  'une synergie ou rivalité entre deux factions et comment ça se traduit sur le plateau',
  'un point sur le set en cours (nouveautés, répartition des raretés, cartes qui se distinguent)',
  'un focus collection sur une carte holo ou numérotée et ce qui la rend recherchée',
  'une carte sous-estimée ou boudée par les joueurs qui mérite une seconde chance, et pourquoi',
  'un combo ou une synergie précise entre deux ou trois cartes spécifiques, avec le déroulé du coup',
  'un deck "petit budget" jouable uniquement avec des cartes Commune et Peu commune',
  'les erreurs les plus fréquentes de deckbuilding chez les joueurs qui débutent, avec des exemples concrets',
  'un guide pour contrer ou affronter un archétype de deck qui revient souvent',
  "ce que les cartes d'un set changent concrètement pour les decks et archétypes déjà existants",
  "une analyse d'un match-up entre deux factions précises et comment l'aborder des deux côtés",
  'un glossaire ou lexique des mécaniques et termes du jeu pour les nouveaux joueurs',
  'un comparatif entre les raretés Prestige I, II et III : valeur de jeu vs valeur de collection',
  "les cartes à prioriser pour compléter sa collection d'un set donné, et pourquoi celles-là",
  "un portrait de style de jeu (agressif, contrôle, valeur/lent) à travers les cartes qui l'incarnent le mieux",
  "un focus sur l'artiste ou l'illustration d'une carte marquante et ce qu'elle apporte à l'ambiance du jeu",
  'un deck multi-factions vs un deck mono-faction : avantages et compromis de chaque approche',
  "un guide des meilleurs boosters/packs à acheter selon l'objectif du joueur (compléter un set, chasser une carte précise, revendre)",
  "un point sur la gestion et la conservation d'une collection (classement, protection, stockage des cartes holos/numérotées/signées)",
  "ce qui fait grimper la cote d'une carte numérotée ou signée aux yeux des collectionneurs",
  "un tour d'horizon des rumeurs et leaks qui circulent sur un prochain set, présentés clairement comme non confirmés",
  'une théorie ou hypothèse sur la direction que pourrait prendre le jeu (nouvelle mécanique, nouvelle faction, évolution du scénario)',
  "une carte qui fait un clin d'oeil à un joueur, un événement ou une figure de la scène compétitive/communautaire, et ce que ça représente",
  "un retour sur un événement communautaire ou compétitif autour de Blue Rising (tournoi, stream, sortie de set) et ce qu'il faut en retenir",
  'un regard critique sur un point qui pose problème actuellement dans le jeu (équilibrage, distribution, disponibilité) et pourquoi',
  "ce que Blue Rising réussit particulièrement bien par rapport à d'autres jeux de cartes, avec des exemples concrets",
  "un portrait d'artiste : le style d'un illustrateur à travers plusieurs de ses cartes",
  "un portrait de joueur ou de figure de la communauté à travers les cartes qui le/la représentent ou qu'il/elle affectionne",
]

const SPECULATIVE_ANGLE_KEYWORDS = ['rumeur', 'leak', 'théorie', 'hypothèse', "clin d'oeil", 'figure de la']

// Schéma de sortie structurée : l'API garantit un JSON valide et conforme —
// fini les erreurs de parsing (caractères de contrôle, guillemets non échappés…).
const ARTICLE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    excerpt: { type: 'string' },
    content: { type: 'string' },
    featured_cards: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'excerpt', 'content', 'featured_cards'],
  additionalProperties: false,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Garde-fou liens internes : parcourt les liens Markdown pointant vers une page
// interne (href commençant par "/") et retire ceux dont le chemin n'existe pas
// dans le catalogue (allowedPaths). Le texte du lien est conservé, seule la
// syntaxe de lien disparaît → aucun lien cassé dans les articles publiés. Les
// liens externes (http…) ne sont pas touchés.
function sanitizeInternalLinks(markdown: string, allowedPaths: Set<string>): { content: string; stripped: number } {
  let stripped = 0
  const content = markdown.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (match, text: string, href: string) => {
    const path = href.split(/[#?]/)[0].replace(/\/+$/, '') || '/'
    if (allowedPaths.has(path)) return match
    stripped++
    return text
  })
  return { content, stripped }
}

// Échappe les caractères de contrôle (retours à la ligne, tabulations…) qui se
// trouvent À L'INTÉRIEUR des chaînes JSON. Les modèles écrivent souvent le
// contenu markdown avec de vrais sauts de ligne, ce que JSON.parse refuse.
function escapeControlCharsInStrings(s: string): string {
  let out = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (escaped) {
      out += ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      out += ch
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      out += ch
      continue
    }
    const code = ch.charCodeAt(0)
    if (inString && code < 0x20) {
      if (ch === '\n') out += '\\n'
      else if (ch === '\r') out += '\\r'
      else if (ch === '\t') out += '\\t'
      else out += '\\u' + code.toString(16).padStart(4, '0')
      continue
    }
    out += ch
  }
  return out
}

// Le modèle peut entourer le JSON de texte (prose, bloc ```json) et y laisser
// des caractères de contrôle bruts. On extrait donc l'objet de façon robuste :
// on essaie chaque candidat tel quel, puis après assainissement.
function extractJson(text: string): unknown {
  const candidates: string[] = []
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) candidates.push(fenced[1].trim())
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1))

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      try {
        return JSON.parse(escapeControlCharsInStrings(candidate))
      } catch {
        // candidat suivant
      }
    }
  }
  throw new Error('Aucun objet JSON valide trouvé dans la réponse du modèle.')
}

// Récupère le texte lisible d'une URL source (extraction HTML grossière, bornée).
// On le fait côté serveur plutôt que via l'outil web_fetch, qui faisait boucler
// le modèle en pause_turn et exploser la consommation de tokens.
async function fetchSourceText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; BlueDexBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, 6000)
  } catch {
    return ''
  }
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return false

  // Requête planifiée (cron) : appelée avec la service role key.
  if (token === SUPABASE_SERVICE_ROLE_KEY) return true

  // Déclenchement manuel depuis l'admin : le token est celui de l'utilisateur connecté.
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await anonClient.auth.getUser(token)
  return !error && !!data.user
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (!(await isAuthorized(req))) {
    return jsonResponse({ error: 'Non autorisé.' }, 401)
  }

  // Paramètres optionnels envoyés par l'admin : un sujet imposé et/ou des
  // sources à consulter. Corps absent = l'IA choisit tout elle-même.
  let requestBody: { subject?: unknown; sources?: unknown } = {}
  try {
    requestBody = await req.json()
  } catch {
    // Pas de corps JSON : comportement automatique.
  }
  const userSubject = typeof requestBody.subject === 'string' ? requestBody.subject.trim() : ''
  const userSources = Array.isArray(requestBody.sources)
    ? requestBody.sources
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 10)
    : []

  // Génération lancée en TÂCHE DE FOND : on répond immédiatement (202) pour ne
  // pas tenir la requête ouverte (limite d'idle timeout de 150 s des edge
  // functions). Le résultat n'est donc plus renvoyé au client — le suivi se fait
  // via les logs [generate], et l'article apparaît en brouillon une fois prêt.
  EdgeRuntime.waitUntil(
    (async () => {
      try {
        console.log('[generate] start', {
          subject: userSubject ? 'oui' : 'non',
          sources: userSources.length,
          hasAnthropicKey: !!ANTHROPIC_API_KEY,
        })
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const [{ data: sets }, { data: cards }, { data: existingArticles }] = await Promise.all([
          supabase.from('sets').select('name, slug, card_count'),
          supabase
            .from('cards')
            .select(
              'name, number, rarity, type, subtype, faction, cost, power, support, effect, is_holo, set:sets(slug, name)',
            ),
          supabase
            .from('articles')
            .select('title, slug, status, topic_angle, featured_cards')
            .order('created_at', { ascending: false })
            .limit(25),
        ])

        // On tire un échantillon aléatoire (et pas toujours les mêmes 60 premières
        // cartes de la table) pour que le modèle ait une vraie chance de parler
        // d'autre chose que des cartes habituelles. Chaque carte reçoit l'URL de sa
        // page pour que le modèle puisse créer des liens internes (SEO) fiables.
        const cardSample = shuffle(cards ?? [])
          .slice(0, 80)
          .map((c) => {
            const setSlug = c.set?.slug
            const url = setSlug && c.number != null ? `/sets/${setSlug}/cards/${c.number}` : undefined
            return {
              name: c.name,
              number: c.number,
              rarity: c.rarity,
              type: c.type,
              subtype: c.subtype,
              faction: c.faction,
              cost: c.cost,
              power: c.power,
              support: c.support,
              effect: c.effect,
              is_holo: c.is_holo,
              set_name: c.set?.name ?? null,
              url,
            }
          })

        // Pages internes vers lesquelles le modèle peut créer des liens (SEO) :
        // sets, deck builder et articles déjà publiés.
        const setsForPrompt = (sets ?? []).map((s) => ({
          name: s.name,
          card_count: s.card_count,
          url: `/sets/${s.slug}`,
        }))
        const publishedArticles = (existingArticles ?? []).filter((a) => a.status === 'published' && a.slug)
        const linkableArticles = publishedArticles
          .slice(0, 15)
          .map((a) => ({ title: a.title, url: `/actus/${a.slug}` }))

        // Ensemble des chemins internes réellement valides : sert de garde-fou pour
        // retirer après coup tout lien que le modèle aurait inventé vers une page
        // inexistante (slug approximatif, carte hors catalogue…).
        const allowedPaths = new Set(['/', '/sets', '/decks', '/actus'])
        for (const s of sets ?? []) {
          if (s.slug) allowedPaths.add(`/sets/${s.slug}`)
        }
        for (const c of cards ?? []) {
          if (c.set?.slug && c.number != null) allowedPaths.add(`/sets/${c.set.slug}/cards/${c.number}`)
        }
        for (const a of publishedArticles) {
          allowedPaths.add(`/actus/${a.slug}`)
        }

        // Cartes déjà mises en avant récemment (top 5, focus carte, etc.) : on les
        // signale au modèle pour qu'il évite de les reprendre en boucle.
        const recentlyFeaturedCards = Array.from(
          new Set((existingArticles ?? []).flatMap((a) => a.featured_cards ?? [])),
        ).slice(0, 60)

        // On évite de reproposer l'un des derniers angles utilisés (environ un
        // tiers du pool, pour laisser le temps aux autres angles de tourner).
        const recentAngles = new Set(
          (existingArticles ?? [])
            .slice(0, Math.ceil(TOPIC_ANGLES.length / 3))
            .map((a) => a.topic_angle)
            .filter(Boolean),
        )
        const availableAngles = TOPIC_ANGLES.filter((t) => !recentAngles.has(t))
        const randomAngle = shuffle(availableAngles.length > 0 ? availableAngles : TOPIC_ANGLES)[0]
        // Sujet imposé par l'admin s'il y en a un, sinon un angle tiré au hasard.
        const topic = userSubject || randomAngle

        const existingTitles = (existingArticles ?? []).map((a) => a.title)

        const isSpeculativeAngle = SPECULATIVE_ANGLE_KEYWORDS.some((kw) => topic.includes(kw))
        const speculativeGuidance = isSpeculativeAngle
          ? `\n\nCet angle touche à des rumeurs, leaks, théories ou à des personnes/événements réels : sois particulièrement rigoureux. Ne présente jamais une rumeur ou une hypothèse comme un fait acquis (utilise des formulations claires : "rumeur non confirmée", "certains joueurs pensent que", "si l'on en croit..."). Ne fais un lien entre une carte et une personne/un événement réel que s'il est corroboré par les données de carte fournies (nom, effet, artiste) ou par une recherche web fiable — n'invente aucune connexion, aucun leak, aucune citation.`
          : ''

        // Consigne d'angle : sujet imposé par l'éditeur, ou angle éditorial libre.
        const angleLine = userSubject
          ? `Écris un nouvel article en français sur le sujet précis demandé par l'éditeur : "${userSubject}". Prends le temps de bien cerner ce sujet, de le comprendre et de le traiter en profondeur, avec justesse et sans le survoler.`
          : `Écris un nouvel article en français dont l'angle est : ${topic}.`

        // Sources fournies par l'éditeur : on récupère leur contenu NOUS-MÊMES
        // (borné) et on l'injecte dans le prompt, plutôt que de laisser le modèle
        // les fetcher via un outil (qui faisait boucler la génération).
        let sourcesGuidance = ''
        if (userSources.length > 0) {
          const fetched = await Promise.all(
            userSources.slice(0, 3).map(async (url) => ({ url, text: await fetchSourceText(url) })),
          )
          const withText = fetched.filter((f) => f.text.length > 0)
          console.log('[generate] sources', { demandées: userSources.length, récupérées: withText.length })
          sourcesGuidance = withText.length
            ? `\n\nL'éditeur te fournit ces sources. Lis-les attentivement, comprends-les et appuie-toi dessus ; cite-les naturellement quand c'est pertinent (sans coller de lien brut ni inventer de citation). Voici leur contenu extrait :\n\n${withText
                .map((f, i) => `Source ${i + 1} (${f.url}) :\n${f.text}`)
                .join('\n\n')}`
            : ''
        }

        const prompt = `Tu écris pour le blog de BlueDex, un site communautaire (non-officiel) dédié au jeu de cartes à collectionner "Blue Rising".

Voici des données réelles du jeu à utiliser comme référence factuelle (n'invente pas de règles qui les contredisent) :

Sets (chaque set a une page à l'URL indiquée dans son champ "url") : ${JSON.stringify(setsForPrompt)}

Extrait de cartes existantes (échantillon aléatoire, pas nécessairement exhaustif ; chaque carte a une page à l'URL indiquée dans son champ "url" quand elle est disponible) : ${JSON.stringify(cardSample)}

Titres d'articles déjà publiés (n'en refais pas un similaire) : ${JSON.stringify(existingTitles)}
${linkableArticles.length ? `\nAutres articles déjà publiés que tu peux citer en lien interne si le sujet s'y prête : ${JSON.stringify(linkableArticles)}\n` : ''}
Cartes déjà mises en avant dans des articles récents (à éviter sauf si l'angle l'exige vraiment — privilégie des cartes différentes pour renouveler le contenu) : ${JSON.stringify(recentlyFeaturedCards)}

Base-toi sur les données du jeu fournies ci-dessus, et sur les sources de l'éditeur s'il y en a. N'invente jamais de règle, d'avis ni de source.

${angleLine}${speculativeGuidance}${sourcesGuidance}

Cet article doit être optimisé pour le référencement naturel (SEO) tout en restant agréable à lire pour de vrais joueurs. Applique ces principes.

Contenu et structure :
- 700 à 1100 mots, en Markdown. Structure claire avec des sous-titres ## (et ### si besoin) qui découpent l'article en sections courtes et scannables.
- Ne répète PAS le titre en début de contenu et n'utilise AUCUN titre de niveau # (H1) : la page affiche déjà le titre en H1. Commence directement par le paragraphe d'introduction, puis utilise ## et ### pour les sections.
- Ton enjoué mais informatif, destiné à des joueurs de Blue Rising. Phrases et paragraphes courts, listes à puces quand c'est pertinent.
- Ne mentionne que des cartes/factions/sets présents dans les données fournies (n'invente rien).
- Termine par une courte section de conclusion.

SEO :
- Choisis une expression-clé principale correspondant à ce qu'un joueur taperait dans Google (ex : "meilleures cartes [faction] Blue Rising", "deck [archétype] Blue Rising", "carte [nom] Blue Rising"). Emploie-la naturellement dans le titre, dans la première phrase de l'article, et dans au moins un sous-titre — sans bourrage de mots-clés (aucune répétition forcée ou artificielle).
- Dans le corps du texte, utilise aussi des variantes et des termes proches de cette expression (synonymes, noms de cartes/factions liés).
- Titre : à la fois accrocheur et descriptif, idéalement entre 45 et 60 caractères, contenant l'expression-clé, sans guillemets autour.
- L'extrait sert de meta description pour Google : une phrase de 140 à 160 caractères, contenant l'expression-clé, qui donne envie de cliquer depuis les résultats de recherche.

Liens internes (essentiel pour le SEO — ne néglige pas ce point) :
- Quand tu mentionnes une carte, un set ou un autre article présents dans les données ci-dessus, transforme naturellement la première mention en lien Markdown vers sa page, en utilisant EXACTEMENT l'URL de son champ "url". Exemple : [Nom de la carte](/sets/mon-set/cards/12).
- Renvoie aussi vers le deck builder (/decks) quand tu évoques la construction de decks, et vers la liste des sets (/sets) quand c'est pertinent.
- N'utilise QUE des URLs présentes dans les données fournies (ou les pages /, /sets, /decks, /actus). N'invente JAMAIS d'URL, et ne mets pas de lien sur une carte dont l'URL n'est pas fournie.
- Vise 3 à 6 liens internes bien répartis et intégrés dans les phrases. Ne fais ni liste de liens, ni lien forcé ou artificiel.

Réponds avec un objet JSON de cette forme (le contenu markdown de l'article va dans le champ "content") :
{"title": "...", "excerpt": "...", "content": "... (markdown) ...", "featured_cards": ["Nom exact de chaque carte mentionnée en bonne place dans l'article, tel qu'il apparaît dans les données fournies"]}`

        const anthropicMessages: Array<{ role: string; content: unknown }> = [{ role: 'user', content: prompt }]

        // Un seul appel. output_config.format (structured outputs) garantit un
        // JSON conforme au schéma → parsing fiable. Pas d'outil serveur, donc
        // pas de boucle pause_turn : rapide et prévisible.
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 6000,
            // effort bas : Sonnet 5 est très agentique par défaut ; on va droit au but.
            output_config: { effort: 'low', format: { type: 'json_schema', schema: ARTICLE_SCHEMA } },
            messages: anthropicMessages,
          }),
        })

        if (!anthropicResponse.ok) {
          const errText = await anthropicResponse.text()
          console.error('[generate] Anthropic API error', anthropicResponse.status, errText)
          return
        }

        const anthropicData = (await anthropicResponse.json()) as {
          content?: Array<{ type: string; text?: string }>
          stop_reason?: string
        }
        console.log('[generate] anthropic response', {
          stop_reason: anthropicData?.stop_reason,
          blocks: anthropicData?.content?.length,
        })

        // On concatène tous les blocs texte (le JSON peut être suivi de prose,
        // ou réparti autrement) avant d'en extraire l'objet JSON.
        const fullText = (anthropicData?.content ?? [])
          .filter((b) => b.type === 'text' && b.text)
          .map((b) => b.text as string)
          .join('\n')
        if (!fullText.trim()) {
          console.error('[generate] réponse Anthropic sans contenu texte')
          return
        }

        const parsed = extractJson(fullText) as {
          title: string
          excerpt: string
          content: string
          featured_cards?: string[]
        }
        // Garde-fou : on retire tout lien interne inventé par le modèle avant
        // d'enregistrer l'article (les liens vers de vraies pages sont conservés).
        const { content, stripped } = sanitizeInternalLinks(parsed.content, allowedPaths)
        console.log('[generate] parsed', {
          title: parsed.title,
          contentLength: content.length,
          strippedLinks: stripped,
        })

        let slug = slugify(parsed.title)
        const { data: slugCollision } = await supabase.from('articles').select('id').eq('slug', slug).maybeSingle()
        if (slugCollision) {
          slug = `${slug}-${Date.now().toString(36)}`
        }

        const { data: inserted, error: insertError } = await supabase
          .from('articles')
          .insert({
            title: parsed.title,
            slug,
            excerpt: parsed.excerpt,
            content,
            status: 'draft',
            topic_angle: topic,
            featured_cards: parsed.featured_cards ?? [],
          })
          .select()
          .single()

        if (insertError) {
          console.error('[generate] insert error', insertError)
          return jsonResponse({ error: insertError.message }, 500)
        }

        console.log('[generate] inserted', { id: inserted?.id, slug })
      } catch (err) {
        console.error('[generate] fatal', err)
      }
    })(),
  )

  return jsonResponse({ status: 'accepted' }, 202)
})
