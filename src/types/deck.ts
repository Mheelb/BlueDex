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
