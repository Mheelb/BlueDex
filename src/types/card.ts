export interface CardSet {
  id: string
  slug: string
  name: string
  release_date: string | null
  card_count: number
  logo_url: string | null
  symbol_url: string | null
}

export const RARITIES = [
  'Commune',
  'Peu commune',
  'Rare',
  'Prestige III',
  'Prestige II',
  'Prestige I',
] as const
export type Rarity = (typeof RARITIES)[number]

export const CARD_TYPES = [
  'Personnage',
  'Événement',
  'Objet',
  'Piège',
  'Artefact',
  'Environnement',
] as const
export type CardType = (typeof CARD_TYPES)[number]

export const TYPE_COLORS: Record<CardType, { bg: string; text: string }> = {
  Personnage: { bg: '#C2AA69', text: '#1a1200' },
  Événement: { bg: '#C02734', text: '#ffffff' },
  Piège: { bg: '#156F56', text: '#ffffff' },
  Environnement: { bg: '#11ABB0', text: '#ffffff' },
  Artefact: { bg: '#E0CFAC', text: '#1a1200' },
  Objet: { bg: '#95488E', text: '#ffffff' },
}

export const FACTIONS = ['Émissaire', 'Veilleur', 'Gardien'] as const
export type Faction = (typeof FACTIONS)[number]

export const SUBTYPES = ['Héros', 'Légende', 'Aspirant'] as const
export type Subtype = (typeof SUBTYPES)[number]

export interface Card {
  id: string
  set_id: string
  number: string
  name: string
  image_url: string | null
  rarity: Rarity
  is_holo: boolean
  is_signed: boolean
  is_numbered: boolean
  numbered_total: number | null
  type: CardType | null
  subtype: Subtype | null
  faction: Faction | null
  cost: number | null
  power: number | null
  support: number | null
  effect: string | null
}

export type CardSort = 'number-asc' | 'number-desc' | 'name-asc' | 'name-desc'

export const COST_RANGE = [0, 10] as const
export const POWER_RANGE = [0, 10] as const
export const SUPPORT_RANGE = [0, 10] as const

export interface CardFilters {
  search: string
  rarity: Rarity[]
  type: CardType[]
  subtype: Subtype[]
  faction: Faction[]
  sort: CardSort
  costRange: [number, number]
  powerRange: [number, number]
  supportRange: [number, number]
}

export function createEmptyCardFilters(): CardFilters {
  return {
    search: '',
    rarity: [],
    type: [],
    subtype: [],
    faction: [],
    sort: 'number-asc',
    costRange: [COST_RANGE[0], COST_RANGE[1]],
    powerRange: [POWER_RANGE[0], POWER_RANGE[1]],
    supportRange: [SUPPORT_RANGE[0], SUPPORT_RANGE[1]],
  }
}
