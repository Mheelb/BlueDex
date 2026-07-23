import { supabase } from '@/lib/supabase'
import type { PriceSnapshot } from '@/types/price'

export const priceKeys = {
  all: ['prices'] as const,
  snapshots: (cardId: string) => [...priceKeys.all, 'snapshots', cardId] as const,
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
