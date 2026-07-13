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

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1] : text
  return JSON.parse(raw.trim())
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

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const [{ data: sets }, { data: cards }, { data: existingArticles }] = await Promise.all([
      supabase.from('sets').select('name, slug, card_count'),
      supabase.from('cards').select('name, rarity, type, subtype, faction, cost, power, support, effect, is_holo'),
      supabase
        .from('articles')
        .select('title, topic_angle, featured_cards')
        .order('created_at', { ascending: false })
        .limit(25),
    ])

    // On tire un échantillon aléatoire (et pas toujours les mêmes 60 premières
    // cartes de la table) pour que le modèle ait une vraie chance de parler
    // d'autre chose que des cartes habituelles.
    const cardSample = shuffle(cards ?? []).slice(0, 80)

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
    const topic = shuffle(availableAngles.length > 0 ? availableAngles : TOPIC_ANGLES)[0]

    const existingTitles = (existingArticles ?? []).map((a) => a.title)

    const isSpeculativeAngle = SPECULATIVE_ANGLE_KEYWORDS.some((kw) => topic.includes(kw))
    const speculativeGuidance = isSpeculativeAngle
      ? `\n\nCet angle touche à des rumeurs, leaks, théories ou à des personnes/événements réels : sois particulièrement rigoureux. Ne présente jamais une rumeur ou une hypothèse comme un fait acquis (utilise des formulations claires : "rumeur non confirmée", "certains joueurs pensent que", "si l'on en croit..."). Ne fais un lien entre une carte et une personne/un événement réel que s'il est corroboré par les données de carte fournies (nom, effet, artiste) ou par une recherche web fiable — n'invente aucune connexion, aucun leak, aucune citation.`
      : ''

    const prompt = `Tu écris pour le blog de BlueDex, un site communautaire (non-officiel) dédié au jeu de cartes à collectionner "Blue Rising".

Voici des données réelles du jeu à utiliser comme référence factuelle (n'invente pas de règles qui les contredisent) :

Sets: ${JSON.stringify(sets)}

Extrait de cartes existantes (échantillon aléatoire, pas nécessairement exhaustif) : ${JSON.stringify(cardSample)}

Titres d'articles déjà publiés (n'en refais pas un similaire) : ${JSON.stringify(existingTitles)}

Cartes déjà mises en avant dans des articles récents (à éviter sauf si l'angle l'exige vraiment — privilégie des cartes différentes pour renouveler le contenu) : ${JSON.stringify(recentlyFeaturedCards)}

Avant d'écrire, utilise l'outil de recherche web pour chercher s'il existe des discussions, avis ou réactions récentes et réellement pertinentes sur le jeu "Blue Rising" (forums, réseaux sociaux, articles communautaires). Si tu trouves quelque chose de concret et pertinent par rapport à l'angle choisi, appuie-toi dessus et mentionne la source de façon naturelle dans le texte (ex : "sur les réseaux, plusieurs joueurs remarquent que...", sans lien brut ni citation inventée). Si la recherche ne renvoie rien de pertinent ou d'exploitable, n'insiste pas et n'invente aucun avis ou source — base-toi uniquement sur les données du jeu fournies ci-dessus.

Écris un nouvel article en français dont l'angle est : ${topic}.${speculativeGuidance}

Cet article doit être optimisé pour le référencement naturel (SEO) tout en restant agréable à lire pour de vrais joueurs. Applique ces principes.

Contenu et structure :
- 700 à 1100 mots, en Markdown. Structure claire avec des sous-titres ## (et ### si besoin) qui découpent l'article en sections courtes et scannables.
- Ton enjoué mais informatif, destiné à des joueurs de Blue Rising. Phrases et paragraphes courts, listes à puces quand c'est pertinent.
- Ne mentionne que des cartes/factions/sets présents dans les données fournies (n'invente rien).
- Termine par une courte section de conclusion.

SEO :
- Choisis une expression-clé principale correspondant à ce qu'un joueur taperait dans Google (ex : "meilleures cartes [faction] Blue Rising", "deck [archétype] Blue Rising", "carte [nom] Blue Rising"). Emploie-la naturellement dans le titre, dans la première phrase de l'article, et dans au moins un sous-titre — sans bourrage de mots-clés (aucune répétition forcée ou artificielle).
- Dans le corps du texte, utilise aussi des variantes et des termes proches de cette expression (synonymes, noms de cartes/factions liés).
- Titre : à la fois accrocheur et descriptif, idéalement entre 45 et 60 caractères, contenant l'expression-clé, sans guillemets autour.
- L'extrait sert de meta description pour Google : une phrase de 140 à 160 caractères, contenant l'expression-clé, qui donne envie de cliquer depuis les résultats de recherche.

Une fois tes recherches terminées (ou d'emblée si elles ne sont pas utiles à cet angle), réponds en dernier avec uniquement un objet JSON strict de cette forme, sans texte autour :
{"title": "...", "excerpt": "...", "content": "... (markdown) ...", "featured_cards": ["Nom exact de chaque carte mentionnée en bonne place dans l'article, tel qu'il apparaît dans les données fournies"]}`

    const anthropicMessages: Array<{ role: string; content: unknown }> = [{ role: 'user', content: prompt }]
    let anthropicData: { content?: Array<{ type: string; text?: string }>; stop_reason?: string } | undefined

    // web_search est un outil exécuté côté serveur Anthropic : la boucle de
    // recherche se fait dans la même requête, mais peut s'arrêter sur
    // stop_reason "pause_turn" si elle prend trop d'itérations. On relance
    // dans ce cas en renvoyant la conversation telle quelle.
    for (let i = 0; i < 3; i++) {
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
          tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
          messages: anthropicMessages,
        }),
      })

      if (!anthropicResponse.ok) {
        const errText = await anthropicResponse.text()
        return jsonResponse({ error: `Anthropic API error: ${errText}` }, 502)
      }

      anthropicData = await anthropicResponse.json()

      if (anthropicData?.stop_reason !== 'pause_turn') break

      anthropicMessages.push({ role: 'assistant', content: anthropicData?.content })
    }

    const textBlocks = (anthropicData?.content ?? []).filter((b) => b.type === 'text' && b.text)
    const textBlock = textBlocks[textBlocks.length - 1]
    if (!textBlock?.text) {
      return jsonResponse({ error: 'Réponse Anthropic sans contenu texte.' }, 502)
    }

    const parsed = extractJson(textBlock.text) as {
      title: string
      excerpt: string
      content: string
      featured_cards?: string[]
    }

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
        content: parsed.content,
        status: 'draft',
        topic_angle: topic,
        featured_cards: parsed.featured_cards ?? [],
      })
      .select()
      .single()

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500)
    }

    return jsonResponse({ article: inserted })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Erreur inconnue.' }, 500)
  }
})
