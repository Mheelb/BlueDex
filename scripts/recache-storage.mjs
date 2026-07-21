// One-shot : réécrit l'en-tête Cache-Control de TOUS les objets de TOUS les
// buckets Storage à 1 an. Les uploads Supabase par défaut posent max-age=3600
// (1h), ce qui force Netlify Image CDN (et les navigateurs) à re-télécharger la
// source depuis Supabase toutes les heures → explosion du « Cached Egress ».
// Les nouveaux uploads sont déjà corrigés côté app (cacheControl 31536000) ;
// ce script rattrape l'existant, qui garde son vieux header.
//
// Coût : un download one-shot par objet (inévitable, il faut ré-uploader les
// octets pour changer le header), puis l'egress récurrent s'effondre.
//
// Usage :
//   node scripts/recache-storage.mjs --dry-run     # liste, ne réécrit rien
//   node scripts/recache-storage.mjs               # réécrit pour de vrai
//   node scripts/recache-storage.mjs --bucket=card-images
//
// Nécessite SUPABASE_SERVICE_ROLE_KEY (dans .env local) — la clé service_role
// contourne la RLS et voit tous les buckets.
import { supabaseAdmin } from './lib/supabaseAdmin.mjs'

const CACHE_CONTROL = '31536000' // 1 an, en secondes
const LIST_PAGE_SIZE = 100
const CONCURRENCY = 4

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const bucketArg = args.find((a) => a.startsWith('--bucket='))
const onlyBucket = bucketArg ? bucketArg.split('=')[1] : null

/** Liste récursivement tous les fichiers d'un bucket (Supabase ne récurse pas). */
async function listAllFiles(bucket, prefix = '') {
  const files = []
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(prefix, { limit: LIST_PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
    if (!data || data.length === 0) break

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      // Un "dossier" n'a pas de métadonnées (id/metadata null) → on descend.
      if (entry.id === null) {
        files.push(...(await listAllFiles(bucket, path)))
      } else {
        files.push({ path, contentType: entry.metadata?.mimetype })
      }
    }
    if (data.length < LIST_PAGE_SIZE) break
  }
  return files
}

/** Télécharge puis ré-uploade un objet en place avec le nouveau cacheControl. */
async function recacheOne(bucket, file) {
  const { data: blob, error: dlError } = await supabaseAdmin.storage.from(bucket).download(file.path)
  if (dlError) throw new Error(`download: ${dlError.message}`)

  const { error: upError } = await supabaseAdmin.storage.from(bucket).upload(file.path, blob, {
    upsert: true,
    cacheControl: CACHE_CONTROL,
    contentType: file.contentType || blob.type || undefined,
  })
  if (upError) throw new Error(`upload: ${upError.message}`)
}

async function processBucket(bucket) {
  const files = await listAllFiles(bucket)
  console.log(`\n📦 ${bucket} — ${files.length} objet(s)`)
  if (dryRun) {
    for (const f of files) console.log(`   [dry-run] ${f.path}`)
    return { bucket, total: files.length, done: 0, errors: 0 }
  }

  let done = 0
  let errors = 0
  let cursor = 0

  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor++]
      try {
        await recacheOne(bucket, file)
      } catch (err) {
        errors++
        console.error(`   ✗ ${file.path} — ${err.message}`)
      }
      done++
      if (done % 25 === 0 || done === files.length) {
        console.log(`   ${done}/${files.length}${errors ? ` (${errors} erreur(s))` : ''}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker))
  return { bucket, total: files.length, done: done - errors, errors }
}

async function main() {
  let buckets
  if (onlyBucket) {
    buckets = [onlyBucket]
  } else {
    const { data, error } = await supabaseAdmin.storage.listBuckets()
    if (error) throw new Error(`listBuckets: ${error.message}`)
    buckets = data.map((b) => b.name)
  }

  console.log(`Cache-Control → max-age=${CACHE_CONTROL} sur : ${buckets.join(', ')}`)
  if (dryRun) console.log('(dry-run : aucune écriture)')

  const summaries = []
  for (const bucket of buckets) {
    summaries.push(await processBucket(bucket))
  }

  console.log('\n=== Résumé ===')
  for (const s of summaries) {
    console.log(`${s.bucket}: ${s.done}/${s.total} réécrits${s.errors ? `, ${s.errors} erreur(s)` : ''}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
