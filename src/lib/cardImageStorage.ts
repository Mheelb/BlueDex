import { supabase } from '@/lib/supabase'

export const CARD_IMAGES_BUCKET = 'card-images'
const CARD_IMAGES_MARKER = `/${CARD_IMAGES_BUCKET}/`

export function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(CARD_IMAGES_MARKER)
  if (idx === -1) return null
  return url.slice(idx + CARD_IMAGES_MARKER.length)
}

export async function deleteCardImage(imageUrl: string | null) {
  if (!imageUrl) return
  const path = storagePathFromUrl(imageUrl)
  if (!path) return
  await supabase.storage.from(CARD_IMAGES_BUCKET).remove([path])
}

export async function uploadCardImage(path: string, file: File) {
  // Les noms de fichiers sont uniques (Date.now()) et jamais réécrits : on peut
  // laisser le CDN/navigateur cacher un an. Évite que Netlify re-télécharge la
  // source depuis Supabase toutes les heures (défaut = 3600s) → egress en moins.
  const { error } = await supabase.storage.from(CARD_IMAGES_BUCKET).upload(path, file, { cacheControl: '31536000' })
  if (error) throw new Error(error.message)
  return supabase.storage.from(CARD_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}
