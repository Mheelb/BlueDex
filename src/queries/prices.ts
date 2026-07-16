import { supabase } from '@/lib/supabase'
import type { PriceListing } from '@/types/price'

export const priceKeys = {
  all: ['prices'] as const,
  history: (cardId: string) => [...priceKeys.all, 'history', cardId] as const,
}

export async function fetchPriceHistory(cardId: string): Promise<PriceListing[]> {
  const { data, error } = await supabase
    .from('price_listings')
    .select('*')
    .eq('card_id', cardId)
    .order('scraped_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data as PriceListing[]
}
