import { describe, expect, it } from 'vitest'
import { CONFIDENCE_THRESHOLD, extractCardNumbers, hasGameSignal, isLikelyLot, scoreListing } from './matchCard.mjs'

function makeCard(overrides) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    number: '001',
    name: 'Carte',
    rarity: 'Commune',
    is_holo: false,
    is_signed: false,
    is_numbered: false,
    is_full_art: false,
    ...overrides,
  }
}

describe('isLikelyLot', () => {
  it('rejects obvious bundle listings', () => {
    expect(isLikelyLot('Lot de 4 cartes Blue Rising BR1')).toBe(true)
    expect(isLikelyLot('Destockage cartes Blue Rising')).toBe(true)
    expect(isLikelyLot('x20 cartes communes Blue Rising')).toBe(true)
  })

  it('does not flag a single-card listing', () => {
    expect(isLikelyLot('Blue Rising BR1.014 Inoxtag')).toBe(false)
  })
})

describe('hasGameSignal', () => {
  it('accepts titles mentioning the game name or set slug', () => {
    expect(hasGameSignal('Blue Rising BR1 008', 'br1')).toBe(true)
    expect(hasGameSignal('inoxtag BR1 014', 'br1')).toBe(true)
    expect(hasGameSignal('blue rising carte rare', 'br1')).toBe(true)
  })

  it('rejects titles from unrelated card games', () => {
    expect(hasGameSignal('Mind rune alt Riftbound', 'br1')).toBe(false)
    expect(hasGameSignal('Lot cartes sorcery gothic', 'br1')).toBe(false)
    expect(hasGameSignal('Hody Jones OP06-035 custom proxy', 'br1')).toBe(false)
  })
})

describe('extractCardNumbers', () => {
  it('extracts a number regardless of separator style', () => {
    expect(extractCardNumbers('Blue Rising BR1.014 Inoxtag', 'br1')).toEqual(['14'])
    expect(extractCardNumbers('inoxtag BR1 014', 'br1')).toEqual(['14'])
    expect(extractCardNumbers('BR1 - 014 - Inoxtag - Blue Rising KC', 'br1')).toEqual(['14'])
    expect(extractCardNumbers('busio BR1 037', 'br1')).toEqual(['37'])
  })

  it('returns nothing when no number follows the slug', () => {
    expect(extractCardNumbers('Cartes communes Blue Rising', 'br1')).toEqual([])
  })

  it('returns multiple distinct numbers when several are present', () => {
    expect(extractCardNumbers('BR1 014 et BR1 037', 'br1')).toEqual(['14', '37'])
  })
})

describe('scoreListing', () => {
  const cards = [
    makeCard({ number: '014', name: 'Inoxtag' }),
    makeCard({ number: '002', name: "Recrue de l'Étoile Bleue" }),
    makeCard({ number: '037', name: 'Busio', rarity: 'Rare' }),
  ]

  it('accepts a number-based match with high confidence', () => {
    const result = scoreListing('Blue Rising BR1.014 Inoxtag', cards, 'br1')
    expect(result).not.toBeNull()
    expect(result.card.name).toBe('Inoxtag')
    expect(result.signal).toBe('number')
    expect(result.score).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD)
  })

  it('accepts a name-only match when the name is clearly present', () => {
    const result = scoreListing("Blue Rising BR1.002 recrue de l'étoile bleu", cards, 'br1')
    expect(result).not.toBeNull()
    expect(result.card.name).toBe("Recrue de l'Étoile Bleue")
  })

  it('rejects listings for a different card game entirely', () => {
    expect(scoreListing('Mind rune alt Riftbound', cards, 'br1')).toBeNull()
  })

  it('rejects lot/bundle listings', () => {
    expect(scoreListing('Lot de cartes Blue Rising BR1', cards, 'br1')).toBeNull()
  })

  it('rejects a number that does not exist among the candidate cards', () => {
    expect(scoreListing('Blue Rising BR1.999', cards, 'br1')).toBeNull()
  })

  it('rejects vague generic listings with no identifiable single card', () => {
    expect(scoreListing('Cartes communes Blue Rising', cards, 'br1')).toBeNull()
  })
})
