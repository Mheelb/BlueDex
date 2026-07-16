// Client Supabase privilégié pour scripts/scrape-vinted.mjs : la clé
// service_role contourne la RLS, nécessaire pour écrire dans price_listings
// (qui n'a aucune policy d'écriture, cf. supabase/migrations/0021_price_listings.sql).
// Sert aussi à la lecture (sets/cards) — un seul client suffit puisque
// service_role voit tout de toute façon.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname, '../..')

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

// Réutilise VITE_SUPABASE_URL (non sensible, déjà public dans le bundle
// front) plutôt que d'exiger un second secret redondant — seule la clé
// service_role a besoin d'être un vrai secret.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase env vars: define VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env locally, as repo secrets in CI).',
  )
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
