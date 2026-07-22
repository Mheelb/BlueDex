import { supabase } from '@/lib/supabase'
import type { CardSet } from '@/types/card'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'

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

export async function createSet(input: TablesInsert<'sets'>): Promise<void> {
  const { error } = await supabase.from('sets').insert({ ...input, card_count: 0 })
  if (error) throw new Error(error.message)
}

export async function updateSet(id: string, input: TablesUpdate<'sets'>): Promise<void> {
  const { error } = await supabase.from('sets').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteSet(id: string): Promise<void> {
  const { error } = await supabase.from('sets').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateSetCardCount(id: string, count: number): Promise<void> {
  const { error } = await supabase.from('sets').update({ card_count: count }).eq('id', id)
  if (error) throw new Error(error.message)
}
