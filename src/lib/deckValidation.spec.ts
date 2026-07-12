import { describe, expect, it } from 'vitest'
import { canAddCard, getDeckIssues, getMaxCopiesForCard, isDeckLegal } from '@/lib/deckValidation'
import type { Card } from '@/types/card'
import type { DeckEntry } from '@/types/deck'

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

describe('getMaxCopiesForCard', () => {
  it('returns the environnement quota for Environnement cards', () => {
    const card = makeCard({ type: 'Environnement' })
    expect(getMaxCopiesForCard(card, 'normal')).toBe(1)
    expect(getMaxCopiesForCard(card, 'rapide')).toBe(1)
  })

  it('returns the artefact quota for Artefact cards, 0 in rapide format', () => {
    const card = makeCard({ type: 'Artefact' })
    expect(getMaxCopiesForCard(card, 'normal')).toBe(1)
    expect(getMaxCopiesForCard(card, 'rapide')).toBe(0)
  })

  it('returns the generic maxCopies for other card types', () => {
    const card = makeCard({ type: 'Personnage' })
    expect(getMaxCopiesForCard(card, 'normal')).toBe(3)
    expect(getMaxCopiesForCard(card, 'rapide')).toBe(2)
  })
})

describe('canAddCard', () => {
  it('allows adding while under the copy limit', () => {
    const card = makeCard({ name: 'Aldric', type: 'Personnage' })
    const entries: DeckEntry[] = [{ card, quantity: 2 }]
    expect(canAddCard(entries, card, 'normal')).toBe(true)
  })

  it('blocks adding once the copy limit is reached', () => {
    const card = makeCard({ name: 'Aldric', type: 'Artefact' })
    const entries: DeckEntry[] = [{ card, quantity: 1 }]
    expect(canAddCard(entries, card, 'normal')).toBe(false)
  })
})

describe('getDeckIssues / isDeckLegal', () => {
  it('flags an empty deck as illegal', () => {
    const issues = getDeckIssues([], 'normal')
    const sizeIssue = issues.find((issue) => issue.key === 'size')
    expect(sizeIssue?.ok).toBe(false)
    expect(isDeckLegal([], 'normal')).toBe(false)
  })

  it('reports the over-limit card name when copies exceed the max', () => {
    const card = makeCard({ name: 'Aldric', type: 'Artefact' })
    const entries: DeckEntry[] = [{ card, quantity: 2 }]
    const copiesIssue = getDeckIssues(entries, 'normal').find((issue) => issue.key === 'copies')
    expect(copiesIssue?.ok).toBe(false)
    expect(copiesIssue?.label).toContain('Aldric')
  })
})
