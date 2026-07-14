import { supabase } from '@/lib/supabase'

export const ARTICLE_IMAGES_BUCKET = 'article-images'
const ARTICLE_IMAGES_MARKER = `/${ARTICLE_IMAGES_BUCKET}/`

export function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(ARTICLE_IMAGES_MARKER)
  if (idx === -1) return null
  return url.slice(idx + ARTICLE_IMAGES_MARKER.length)
}

export async function deleteArticleImage(imageUrl: string | null) {
  if (!imageUrl) return
  const path = storagePathFromUrl(imageUrl)
  if (!path) return
  await supabase.storage.from(ARTICLE_IMAGES_BUCKET).remove([path])
}

export async function uploadArticleImage(path: string, file: File) {
  const { error } = await supabase.storage.from(ARTICLE_IMAGES_BUCKET).upload(path, file)
  if (error) throw new Error(error.message)
  return supabase.storage.from(ARTICLE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}
