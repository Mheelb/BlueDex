import { supabase } from '@/lib/supabase'

export const AVATARS_BUCKET = 'avatars'

export async function uploadAvatar(userId: string, file: File) {
  const path = `${userId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, { cacheControl: '31536000' })
  if (error) throw new Error(error.message)
  return supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl
}
