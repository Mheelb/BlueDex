import { supabase } from '@/lib/supabase'
import { convertImageToWebP } from '@/lib/imageCompression'
import { CARD_IMAGES_BUCKET, storagePathFromUrl, uploadCardImage } from '@/lib/cardImageStorage'

const CONCURRENCY = 4

export interface MigrationProgress {
  done: number
  total: number
}

export interface MigrationResult {
  cardId: string
  status: 'optimized' | 'skipped' | 'error'
  beforeBytes?: number
  afterBytes?: number
  message?: string
}

export interface MigrationSummary {
  results: MigrationResult[]
  optimizedCount: number
  skippedCount: number
  errorCount: number
  bytesSaved: number
}

async function migrateOneCardImage(card: { id: string; image_url: string }): Promise<MigrationResult> {
  const oldPath = storagePathFromUrl(card.image_url)
  if (!oldPath) {
    return { cardId: card.id, status: 'skipped', message: "L'image n'est pas dans le bucket card-images." }
  }

  const response = await fetch(card.image_url)
  if (!response.ok) throw new Error(`Téléchargement échoué (${response.status})`)
  const blob = await response.blob()
  const originalFile = new File([blob], oldPath.split('/').pop() ?? 'image', { type: blob.type })

  const optimized = await convertImageToWebP(originalFile)
  if (optimized === originalFile || optimized.size >= originalFile.size) {
    return { cardId: card.id, status: 'skipped', beforeBytes: originalFile.size, afterBytes: originalFile.size }
  }

  const newPath = `${oldPath.replace(/\.[^./]+$/, '')}-${Date.now()}.webp`
  const newUrl = await uploadCardImage(newPath, optimized)

  const { error: updateError } = await supabase.from('cards').update({ image_url: newUrl }).eq('id', card.id)
  if (updateError) {
    await supabase.storage.from(CARD_IMAGES_BUCKET).remove([newPath])
    throw new Error(updateError.message)
  }

  await supabase.storage.from(CARD_IMAGES_BUCKET).remove([oldPath])

  return { cardId: card.id, status: 'optimized', beforeBytes: originalFile.size, afterBytes: optimized.size }
}

export async function migrateAllCardImages(onProgress?: (progress: MigrationProgress) => void): Promise<MigrationSummary> {
  const { data: cards, error } = await supabase.from('cards').select('id, image_url').not('image_url', 'is', null)
  if (error) throw new Error(error.message)

  const allCards = (cards ?? []) as { id: string; image_url: string }[]
  const total = allCards.length
  const results: MigrationResult[] = []
  let done = 0

  // In this app, images only ever reach the bucket through convertImageToWebP (either the
  // admin upload form, or a previous run of this migration) — so a .webp file here is always
  // already compressed. Re-encoding an already-lossy WebP isn't free: it decodes pixels that
  // already carry the previous pass's artifacts and re-quantizes them, which tends to keep
  // shrinking the file a little further each run at the cost of real, compounding quality loss.
  // Skip those without re-downloading/re-encoding them.
  const queue: { id: string; image_url: string }[] = []
  for (const card of allCards) {
    if (/\.webp$/i.test(card.image_url)) {
      results.push({ cardId: card.id, status: 'skipped', message: 'Déjà en WebP' })
      done++
    } else {
      queue.push(card)
    }
  }
  onProgress?.({ done, total })

  let cursor = 0

  async function worker() {
    while (cursor < queue.length) {
      const card = queue[cursor]
      cursor++
      try {
        results.push(await migrateOneCardImage(card))
      } catch (err) {
        results.push({ cardId: card.id, status: 'error', message: (err as Error).message })
      }
      done++
      onProgress?.({ done, total })
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

  const bytesSaved = results.reduce((sum, r) => sum + ((r.beforeBytes ?? 0) - (r.afterBytes ?? 0)), 0)

  return {
    results,
    optimizedCount: results.filter((r) => r.status === 'optimized').length,
    skippedCount: results.filter((r) => r.status === 'skipped').length,
    errorCount: results.filter((r) => r.status === 'error').length,
    bytesSaved,
  }
}
