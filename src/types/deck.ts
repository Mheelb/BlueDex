import type { Card } from '@/types/card'

export const DECK_FORMATS = ['normal', 'rapide'] as const
export type DeckFormat = (typeof DECK_FORMATS)[number]

export interface DeckFormatRule {
  size: number
  maxCopies: number
  environnementCount: number
  artefactCount: number
  minDistinctAspirants: number
}

export const DECK_FORMAT_RULES: Record<DeckFormat, DeckFormatRule> = {
  normal: { size: 42, maxCopies: 3, environnementCount: 1, artefactCount: 1, minDistinctAspirants: 4 },
  rapide: { size: 31, maxCopies: 2, environnementCount: 1, artefactCount: 0, minDistinctAspirants: 3 },
}

export const DECK_FORMAT_LABELS: Record<DeckFormat, string> = {
  normal: 'Normal',
  rapide: 'Rapide',
}

export const DECK_FORMAT_COLORS: Record<DeckFormat, { bg: string; text: string }> = {
  normal: { bg: '#2454C7', text: '#ffffff' },
  rapide: { bg: '#D97706', text: '#ffffff' },
}

export interface Deck {
  id: string
  user_id: string
  name: string
  format: DeckFormat
  is_public: boolean
  star_count: number
  created_at: string
  updated_at: string
}

export interface DeckEntry {
  card: Card
  quantity: number
}

export interface CardWithSet extends Card {
  set: {
    name: string
    slug: string
  }
}

export interface DeckListItem {
  id: string
  name: string
  format: DeckFormat
  star_count: number
  updated_at: string
  user_id: string
  author: { display_name: string; avatar_url: string | null } | null
}

export interface PaginatedResult<T> {
  rows: T[]
  total: number
}

export const DECK_SORTS = ['updated_at-desc', 'updated_at-asc', 'name-asc', 'name-desc', 'star_count-desc'] as const
export type DeckSort = (typeof DECK_SORTS)[number]

export const DECK_SORT_LABELS: Record<DeckSort, string> = {
  'updated_at-desc': 'Plus récent',
  'updated_at-asc': 'Plus ancien',
  'name-asc': 'Nom (A → Z)',
  'name-desc': 'Nom (Z → A)',
  'star_count-desc': 'Plus populaire',
}

export interface DeckListQuery {
  search: string
  sort: DeckSort
  // Filtre par format pour l'instant ; d'autres facettes (niveau, sous-type...)
  // viendront plus tard une fois qu'on aura un système de tags sur les decks.
  format: DeckFormat | 'all'
}

export function createEmptyDeckListQuery(): DeckListQuery {
  return { search: '', sort: 'updated_at-desc', format: 'all' }
}
