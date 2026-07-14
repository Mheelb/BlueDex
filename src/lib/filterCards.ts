import type { Card, CardFilters } from '@/types/card'
import { COST_RANGE, POWER_RANGE, SUPPORT_RANGE } from '@/types/card'

// Insensible aux accents en plus de la casse : une recherche "eclaireur" doit
// aussi trouver "Éclaireur".
function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function matchesRange(value: number | null, range: [number, number], fullRange: readonly [number, number]) {
  const [min, max] = range
  if (min <= fullRange[0] && max >= fullRange[1]) return true
  return value !== null && value >= min && value <= max
}

function matchesFacet<T extends string>(value: T | null, selected: T[]) {
  if (selected.length === 0) return true
  return value !== null && selected.includes(value)
}

function compareNumbers(a: string, b: string) {
  const na = Number.parseInt(a, 10)
  const nb = Number.parseInt(b, 10)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
  return a.localeCompare(b)
}

export function filterAndSortCards<T extends Card>(cards: T[], filters: CardFilters): T[] {
  const query = normalizeSearch(filters.search.trim())

  const result = cards.filter((card) => {
    if (query && !normalizeSearch(card.name).includes(query)) return false
    if (!matchesFacet(card.rarity, filters.rarity)) return false
    if (!matchesFacet(card.type, filters.type)) return false
    if (!matchesFacet(card.subtype, filters.subtype)) return false
    if (!matchesFacet(card.faction, filters.faction)) return false
    if (!matchesFacet(card.artist, filters.artist)) return false
    if (!matchesRange(card.cost, filters.costRange, COST_RANGE)) return false
    if (!matchesRange(card.power, filters.powerRange, POWER_RANGE)) return false
    if (!matchesRange(card.support, filters.supportRange, SUPPORT_RANGE)) return false
    return true
  })

  return result.sort((a, b) => {
    switch (filters.sort) {
      case 'number-desc':
        return compareNumbers(b.number, a.number)
      case 'name-asc':
        return a.name.localeCompare(b.name)
      case 'name-desc':
        return b.name.localeCompare(a.name)
      case 'number-asc':
      default:
        return compareNumbers(a.number, b.number)
    }
  })
}
