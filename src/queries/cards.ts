import { supabase } from '@/lib/supabase'
import type { Card } from '@/types/card'
import type { CardWithSet } from '@/types/deck'

export const cardKeys = {
  all: ['cards'] as const,
  bySet: (setId: string) => [...cardKeys.all, 'set', setId] as const,
  detail: (setId: string, number: string) => [...cardKeys.all, 'detail', setId, number] as const,
  featured: (setId: string) => [...cardKeys.all, 'featured', setId] as const,
  allWithSet: () => [...cardKeys.all, 'all-with-set'] as const,
}

export async function fetchCardsBySet(setId: string, orderByNumber = false): Promise<Card[]> {
  let query = supabase.from('cards').select('*').eq('set_id', setId)
  if (orderByNumber) query = query.order('number', { ascending: true })

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Card[]
}

export async function fetchCardByNumber(setId: string, number: string): Promise<Card> {
  const { data, error } = await supabase.from('cards').select('*').eq('set_id', setId).eq('number', number).single()

  if (error || !data) throw new Error(error?.message ?? 'Carte introuvable.')
  return data as Card
}

export async function fetchAllCardsWithSet(): Promise<CardWithSet[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*, set:sets(name, slug)')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data as unknown as CardWithSet[]
}

export async function fetchFeaturedCards(setId: string, limit: number): Promise<Card[]> {
  const { data } = await supabase
    .from('cards')
    .select('*')
    .eq('set_id', setId)
    .not('image_url', 'is', null)
    .order('is_holo', { ascending: false })
    .limit(limit)

  return (data as Card[]) ?? []
}
