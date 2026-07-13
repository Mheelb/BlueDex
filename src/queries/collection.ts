import { supabase } from '@/lib/supabase'

export const collectionKeys = {
  all: ['collection'] as const,
  mine: (userId: string) => [...collectionKeys.all, 'mine', userId] as const,
}

export async function fetchMyCollection(userId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('collection_cards').select('card_id, quantity').eq('user_id', userId)
  if (error) throw new Error(error.message)
  return new Map((data ?? []).map((row) => [row.card_id, row.quantity]))
}

export async function setCollectionQuantity(userId: string, cardId: string, quantity: number): Promise<void> {
  if (quantity <= 0) {
    const { error } = await supabase.from('collection_cards').delete().eq('user_id', userId).eq('card_id', cardId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase
    .from('collection_cards')
    .upsert({ user_id: userId, card_id: cardId, quantity }, { onConflict: 'user_id,card_id' })
  if (error) throw new Error(error.message)
}

export async function toggleCollectionOwned(userId: string, cardId: string, owned: boolean): Promise<void> {
  return setCollectionQuantity(userId, cardId, owned ? 1 : 0)
}
