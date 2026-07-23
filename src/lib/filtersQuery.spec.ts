import { describe, expect, it } from 'vitest'
import { filtersToQuery, queryToFilters } from '@/lib/filtersQuery'
import { createEmptyCardFilters } from '@/types/card'
import type { CardFilters } from '@/types/card'

describe('filtersToQuery', () => {
  it("n'émet aucun paramètre pour des filtres par défaut", () => {
    expect(filtersToQuery(createEmptyCardFilters())).toEqual({})
  })

  it('sérialise recherche, facettes, tri et ranges non par défaut', () => {
    const filters: CardFilters = {
      ...createEmptyCardFilters(),
      search: 'dragon',
      rarity: ['Rare', 'Mythique'],
      type: ['Personnage'],
      artist: ['Jane Doe'],
      sort: 'name-desc',
      costRange: [2, 5],
    }
    expect(filtersToQuery(filters)).toEqual({
      q: 'dragon',
      rarity: 'rare,mythique',
      type: 'personnage',
      artist: 'Jane Doe',
      sort: 'name-desc',
      cost: '2-5',
    })
  })

  it('sérialise les valeurs à accents/espaces en slugs propres', () => {
    const filters: CardFilters = {
      ...createEmptyCardFilters(),
      rarity: ['Peu commune'],
      type: ['Événement'],
      faction: ['Émissaire'],
    }
    expect(filtersToQuery(filters)).toEqual({
      rarity: 'peu-commune',
      type: 'evenement',
      faction: 'emissaire',
    })
  })

  it('omet un range plein', () => {
    const filters = { ...createEmptyCardFilters(), powerRange: [0, 10] as [number, number] }
    expect(filtersToQuery(filters).power).toBeUndefined()
  })
})

describe('queryToFilters', () => {
  it('retourne les défauts pour une query vide', () => {
    expect(queryToFilters({})).toEqual(createEmptyCardFilters())
  })

  it('ignore les valeurs de facette invalides', () => {
    expect(queryToFilters({ rarity: 'rare,inexistante' }).rarity).toEqual(['Rare'])
    expect(queryToFilters({ type: 'bidon' }).type).toEqual([])
    expect(queryToFilters({ sort: 'nope' }).sort).toBe('number-asc')
  })

  it('parse les slugs vers les valeurs métier', () => {
    expect(queryToFilters({ rarity: 'peu-commune' }).rarity).toEqual(['Peu commune'])
    expect(queryToFilters({ type: 'evenement' }).type).toEqual(['Événement'])
    expect(queryToFilters({ faction: 'emissaire' }).faction).toEqual(['Émissaire'])
  })

  it('déduplique les facettes et accepte les artistes libres', () => {
    expect(queryToFilters({ rarity: 'rare,rare' }).rarity).toEqual(['Rare'])
    expect(queryToFilters({ artist: 'Jane Doe' }).artist).toEqual(['Jane Doe'])
  })

  it('parse et borne les ranges', () => {
    expect(queryToFilters({ cost: '3-7' }).costRange).toEqual([3, 7])
    expect(queryToFilters({ cost: '7-3' }).costRange).toEqual([3, 7])
    expect(queryToFilters({ cost: '-5-99' }).costRange).toEqual([0, 10])
    expect(queryToFilters({ cost: 'abc' }).costRange).toEqual([0, 10])
  })
})

describe('round-trip', () => {
  it('query -> filtres -> query est stable', () => {
    const filters: CardFilters = {
      ...createEmptyCardFilters(),
      search: 'aile',
      rarity: ['Commune'],
      faction: ['Veilleur'],
      sort: 'name-asc',
      supportRange: [1, 4],
    }
    expect(queryToFilters(filtersToQuery(filters))).toEqual(filters)
  })
})
