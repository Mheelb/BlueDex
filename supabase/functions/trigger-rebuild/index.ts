// Supabase Edge Function: déclenche un nouveau déploiement Netlify via un Build
// Hook. Sert à régénérer les pages pré-rendues (SEO) après publication d'un
// article ou import de cartes/sets.
//
// L'URL du Build Hook est un SECRET : elle vit uniquement ici, côté serveur,
// dans la variable d'env NETLIFY_BUILD_HOOK_URL. Elle n'est jamais exposée au
// navigateur. Réservé aux administrateurs.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const NETLIFY_BUILD_HOOK_URL = Deno.env.get('NETLIFY_BUILD_HOOK_URL')!

const CORS_HEADERS = {tr
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** Vérifie que l'appelant est un administrateur connecté. */
async function isAdmin(req: Request): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return false

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await anonClient.auth.getUser(token)
  if (error || !data.user) return false

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', data.user.id).single()
  return !!profile?.is_admin
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (!(await isAdmin(req))) {
    return jsonResponse({ error: 'Non autorisé.' }, 401)
  }

  if (!NETLIFY_BUILD_HOOK_URL) {
    return jsonResponse({ error: 'NETLIFY_BUILD_HOOK_URL non configurée.' }, 500)
  }

  try {
    const res = await fetch(NETLIFY_BUILD_HOOK_URL, { method: 'POST' })
    if (!res.ok) {
      const text = await res.text()
      return jsonResponse({ error: `Netlify a répondu ${res.status}: ${text}` }, 502)
    }
    return jsonResponse({ triggered: true })
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Erreur inconnue.' }, 500)
  }
})
