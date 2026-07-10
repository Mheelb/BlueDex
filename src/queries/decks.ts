import { supabase } from '@/lib/supabase'
import type { Card } from '@/types/card'
import type { Deck, DeckEntry, DeckFormat } from '@/types/deck'

export const deckKeys = {
  all: ['decks'] as const,
  detail: (deckId: string) => [...deckKeys.all, 'detail', deckId] as const,
}

export interface DeckWithCards {
  deck: Deck
  entries: DeckEntry[]
}

export async function fetchDeckWithCards(deckId: string): Promise<DeckWithCards> {
  const { data: deck, error: deckError } = await supabase.from('decks').select('*').eq('id', deckId).single()
  if (deckError || !deck) throw new Error(deckError?.message ?? 'Deck introuvable.')

  const { data: rows, error: cardsError } = await supabase
    .from('deck_cards')
    .select('quantity, card:cards(*)')
    .eq('deck_id', deckId)
  if (cardsError) throw new Error(cardsError.message)

  const entries: DeckEntry[] = (rows ?? []).map((row) => ({
    card: row.card as unknown as Card,
    quantity: row.quantity,
  }))

  return { deck: deck as Deck, entries }
}

export async function saveDeck(
  deckId: string | null,
  name: string,
  format: DeckFormat,
  entries: DeckEntry[],
): Promise<string> {
  const { data, error } = await supabase.rpc('save_deck', {
    p_deck_id: deckId,
    p_name: name,
    p_format: format,
    p_entries: entries.map((e) => ({ card_id: e.card.id, quantity: e.quantity })),
  })
  if (error || !data) throw new Error(error?.message ?? 'Impossible d\'enregistrer le deck.')
  return data as string
}
