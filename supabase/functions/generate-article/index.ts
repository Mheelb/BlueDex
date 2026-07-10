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
  'une présentation d\'une des quatre factions (Émissaire, Veilleur, Gardien, Éclaireur) et de son identité de jeu',
  'un guide sur un archétype de deck possible avec les cartes existantes',
  'une comparaison entre plusieurs cartes de rareté proche',
  'un top 5 des cartes les plus intéressantes actuellement disponibles, avec justification',
  'des conseils pour un joueur débutant qui découvre Blue Rising',
  'un décryptage d\'une mécanique de jeu (coût, puissance, soutien, effets) à travers des exemples de cartes',
  'une synergie ou rivalité entre deux factions et comment ça se traduit sur le plateau',
  'un point sur le set en cours (nouveautés, répartition des raretés, cartes qui se distinguent)',
  'un focus collection sur une carte holo ou numérotée et ce qui la rend recherchée',
]

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
      supabase
        .from('cards')
        .select('name, rarity, type, subtype, faction, cost, power, support, effect, is_holo')
        .limit(60),
      supabase.from('articles').select('title').order('created_at', { ascending: false }).limit(20),
    ])

    const topic = TOPIC_ANGLES[Math.floor(Math.random() * TOPIC_ANGLES.length)]
    const existingTitles = (existingArticles ?? []).map((a) => a.title)

    const prompt = `Tu écris pour le blog de BlueDex, un site communautaire (non-officiel) dédié au jeu de cartes à collectionner "Blue Rising".

Voici des données réelles du jeu à utiliser comme référence factuelle (n'invente pas de règles qui les contredisent) :

Sets: ${JSON.stringify(sets)}

Extrait de cartes existantes: ${JSON.stringify(cards)}

Titres d'articles déjà publiés (n'en refais pas un similaire) : ${JSON.stringify(existingTitles)}

Écris un nouvel article en français dont l'angle est : ${topic}.

Contraintes :
- Ton enjoué mais informatif, destiné à des joueurs de Blue Rising.
- Ne mentionne que des cartes/factions/sets présents dans les données fournies.
- 300 à 500 mots, en Markdown (titres ##, listes si utile).
- Un titre court et accrocheur (pas de guillemets autour).
- Un extrait d'une phrase (max 160 caractères) qui résume l'article.

Réponds uniquement avec un objet JSON strict de cette forme, sans texte autour :
{"title": "...", "excerpt": "...", "content": "... (markdown) ..."}`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text()
      return jsonResponse({ error: `Anthropic API error: ${errText}` }, 502)
    }

    const anthropicData = await anthropicResponse.json()
    const textBlock = anthropicData.content?.find((b: { type: string }) => b.type === 'text')
    if (!textBlock) {
      return jsonResponse({ error: 'Réponse Anthropic sans contenu texte.' }, 502)
    }

    const parsed = extractJson(textBlock.text) as { title: string; excerpt: string; content: string }

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
