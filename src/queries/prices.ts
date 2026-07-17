import { supabase } from '@/lib/supabase'
import type { PriceListing, PriceSnapshot } from '@/types/price'

export const priceKeys = {
  all: ['prices'] as const,
  history: (cardId: string) => [...priceKeys.all, 'history', cardId] as const,
  snapshots: (cardId: string) => [...priceKeys.all, 'snapshots', cardId] as const,
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

export async function fetchPriceSnapshots(cardId: string): Promise<PriceSnapshot[]> {
  const { data, error } = await supabase
    .from('price_daily_snapshots')
    .select('*')
    .eq('card_id', cardId)
    .order('snapshot_date', { ascending: true })

  if (error) throw new Error(error.message)
  return data as PriceSnapshot[]
}
