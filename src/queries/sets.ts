import { supabase } from '@/lib/supabase'
import type { CardSet } from '@/types/card'

export const setKeys = {
  all: ['sets'] as const,
  list: (order: 'release_date' | 'created_at') => [...setKeys.all, 'list', order] as const,
  detail: (slug: string) => [...setKeys.all, 'detail', slug] as const,
}

export async function fetchSets(order: 'release_date' | 'created_at'): Promise<CardSet[]> {
  const { data, error } = await supabase.from('sets').select('*').order(order, { ascending: false })
  if (error) throw new Error(error.message)
  return data as CardSet[]
}

export async function fetchSetBySlug(slug: string): Promise<CardSet> {
  const { data, error } = await supabase.from('sets').select('*').eq('slug', slug).single()
  if (error || !data) throw new Error(error?.message ?? 'Set introuvable.')
  return data as CardSet
}
