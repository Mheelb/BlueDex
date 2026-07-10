import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/profile'

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (userId: string) => [...profileKeys.all, 'detail', userId] as const,
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error || !data) throw new Error(error?.message ?? 'Profil introuvable.')
  return data as Profile
}

export async function updateProfileAvatar(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId)
  if (error) throw new Error(error.message)
}
