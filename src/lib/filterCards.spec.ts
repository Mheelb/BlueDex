import { describe, expect, it } from 'vitest'
import { filterAndSortCards } from '@/lib/filterCards'
import { createEmptyCardFilters } from '@/types/card'
import type { Card } from '@/types/card'

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    set_id: 'set-1',
    number: '001',
    name: 'Carte',
    image_url: null,
    rarity: 'Commune',
    is_holo: false,
    is_signed: false,
    is_numbered: false,
    numbered_total: null,
    is_full_art: false,
    is_overframe: false,
    type: 'Personnage',
    subtype: null,
    faction: null,
    cost: 3,
    power: 3,
    support: 3,
    effect: null,
    artist: null,
    ...overrides,
  }
}

describe('filterAndSortCards', () => {
  const cards = [
    makeCard({ number: '003', name: 'Zephyr', type: 'Personnage', faction: 'Émissaire', cost: 2 }),
    makeCard({ number: '001', name: 'Aldric', type: 'Objet', faction: 'Gardien', cost: 5 }),
    makeCard({ number: '002', name: 'Brise', type: 'Personnage', faction: 'Émissaire', cost: 8 }),
  ]

  it('filters by search query on name, case-insensitive', () => {
    const filters = { ...createEmptyCardFilters(), search: 'ald' }
    const result = filterAndSortCards(cards, filters)
    expect(result.map((c) => c.name)).toEqual(['Aldric'])
  })

  it('filters by search query on name, accent-insensitive', () => {
    const accentedCards = [...cards, makeCard({ number: '004', name: 'Éclaireur' })]

    expect(
      filterAndSortCards(accentedCards, { ...createEmptyCardFilters(), search: 'eclaireur' }).map((c) => c.name),
    ).toEqual(['Éclaireur'])
    expect(
      filterAndSortCards(accentedCards, { ...createEmptyCardFilters(), search: 'éclaireur' }).map((c) => c.name),
    ).toEqual(['Éclaireur'])
  })

  it('filters by type facet', () => {
    const filters = { ...createEmptyCardFilters(), type: ['Objet' as const] }
    const result = filterAndSortCards(cards, filters)
    expect(result.map((c) => c.name)).toEqual(['Aldric'])
  })

  it('filters by cost range', () => {
    const filters = { ...createEmptyCardFilters(), costRange: [0, 3] as [number, number] }
    const result = filterAndSortCards(cards, filters)
    expect(result.map((c) => c.name)).toEqual(['Zephyr'])
  })

  it('sorts by number ascending by default', () => {
    const result = filterAndSortCards(cards, createEmptyCardFilters())
    expect(result.map((c) => c.number)).toEqual(['001', '002', '003'])
  })

  it('sorts by name descending', () => {
    const filters = { ...createEmptyCardFilters(), sort: 'name-desc' as const }
    const result = filterAndSortCards(cards, filters)
    expect(result.map((c) => c.name)).toEqual(['Zephyr', 'Brise', 'Aldric'])
  })
})
