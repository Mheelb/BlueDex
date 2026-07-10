import { supabase } from '@/lib/supabase'
import type { Card } from '@/types/card'
import type { Deck, DeckEntry, DeckFormat, DeckListItem, DeckListQuery, PaginatedResult } from '@/types/deck'

export const DECK_LIST_PAGE_SIZE = 10

export const deckKeys = {
  all: ['decks'] as const,
  detail: (deckId: string) => [...deckKeys.all, 'detail', deckId] as const,
  publicList: (page: number, filters: DeckListQuery) => [...deckKeys.all, 'public', page, filters] as const,
  myList: (userId: string, page: number, filters: DeckListQuery) => [...deckKeys.all, 'mine', userId, page, filters] as const,
  bookmarkedList: (userId: string, page: number, filters: DeckListQuery) =>
    [...deckKeys.all, 'bookmarked', userId, page, filters] as const,
  bookmarkedIds: (userId: string) => [...deckKeys.all, 'bookmarked-ids', userId] as const,
  starredIds: (userId: string) => [...deckKeys.all, 'starred-ids', userId] as const,
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
  isPublic: boolean,
  coverCardId: string | null,
  entries: DeckEntry[],
): Promise<string> {
  const { data, error } = await supabase.rpc('save_deck', {
    p_deck_id: deckId,
    p_name: name,
    p_format: format,
    p_is_public: isPublic,
    p_cover_card_id: coverCardId,
    p_entries: entries.map((e) => ({ card_id: e.card.id, quantity: e.quantity })),
  })
  if (error || !data) throw new Error(error?.message ?? 'Impossible d\'enregistrer le deck.')
  return data as string
}

function pageRange(page: number): [number, number] {
  const from = page * DECK_LIST_PAGE_SIZE
  return [from, from + DECK_LIST_PAGE_SIZE - 1]
}

function applyDeckListQuery(query: any, filters: DeckListQuery) {
  let q = query
  const search = filters.search.trim()
  if (search) q = q.ilike('name', `%${search}%`)
  if (filters.format !== 'all') q = q.eq('format', filters.format)
  const [field, direction] = filters.sort.split('-') as [string, 'asc' | 'desc']
  return q.order(field, { ascending: direction === 'asc' })
}

export async function fetchPublicDecks(page: number, filters: DeckListQuery): Promise<PaginatedResult<DeckListItem>> {
  const [from, to] = pageRange(page)
  const query = applyDeckListQuery(
    supabase
      .from('decks')
      .select(
        'id, name, format, star_count, updated_at, user_id, author:profiles(display_name, avatar_url), cover_card:cards!cover_card_id(image_url, name, is_holo)',
        { count: 'exact' },
      )
      .eq('is_public', true),
    filters,
  )
  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { rows: (data ?? []) as unknown as DeckListItem[], total: count ?? 0 }
}

export async function fetchMyDecks(
  userId: string,
  page: number,
  filters: DeckListQuery,
): Promise<PaginatedResult<DeckListItem>> {
  const [from, to] = pageRange(page)
  const query = applyDeckListQuery(
    supabase
      .from('decks')
      .select('id, name, format, star_count, updated_at, user_id, cover_card:cards!cover_card_id(image_url, name, is_holo)', {
        count: 'exact',
      })
      .eq('user_id', userId),
    filters,
  )
  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  const rows: DeckListItem[] = (data ?? []).map((row) => ({ ...row, author: null }))
  return { rows, total: count ?? 0 }
}

export async function fetchBookmarkedDecks(
  bookmarkedDeckIds: string[],
  page: number,
  filters: DeckListQuery,
): Promise<PaginatedResult<DeckListItem>> {
  if (bookmarkedDeckIds.length === 0) return { rows: [], total: 0 }

  const [from, to] = pageRange(page)
  const query = applyDeckListQuery(
    supabase
      .from('decks')
      .select(
        'id, name, format, star_count, updated_at, user_id, author:profiles(display_name, avatar_url), cover_card:cards!cover_card_id(image_url, name, is_holo)',
        { count: 'exact' },
      )
      .in('id', bookmarkedDeckIds),
    filters,
  )
  const { data, error, count } = await query.range(from, to)
  if (error) throw new Error(error.message)

  return { rows: (data ?? []) as unknown as DeckListItem[], total: count ?? 0 }
}

export async function fetchBookmarkedDeckIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('deck_bookmarks').select('deck_id').eq('user_id', userId)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((row) => row.deck_id))
}

export async function addBookmark(deckId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('deck_bookmarks').insert({ deck_id: deckId, user_id: userId })
  if (error) throw new Error(error.message)
}

export async function removeBookmark(deckId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('deck_bookmarks').delete().eq('deck_id', deckId).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function fetchStarredDeckIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('deck_stars').select('deck_id').eq('user_id', userId)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((row) => row.deck_id))
}

export async function addStar(deckId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('deck_stars').insert({ deck_id: deckId, user_id: userId })
  if (error) throw new Error(error.message)
}

export async function removeStar(deckId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('deck_stars').delete().eq('deck_id', deckId).eq('user_id', userId)
  if (error) throw new Error(error.message)
}
