import { describe, expect, it } from 'vitest'
import { deckExportFilename, formatDeckExport } from '@/lib/deckExport'
import { DECK_FORMAT_LABELS } from '@/types/deck'
import type { DeckEntry } from '@/types/deck'
import type { Card, CardType } from '@/types/card'

function makeCard(overrides: Partial<Card> = {}): Card {
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
    cost: null,
    power: null,
    support: null,
    effect: null,
    artist: null,
    ...overrides,
  }
}

function entry(name: string, number: string, type: CardType | null, quantity: number): DeckEntry {
  return { card: makeCard({ name, number, type }), quantity }
}

describe('formatDeckExport', () => {
  it('écrit un en-tête avec nom, format et total', () => {
    const out = formatDeckExport('Mon deck', 'normal', [entry('Aile', '001', 'Personnage', 2)])
    const lines = out.split('\n')
    expect(lines[0]).toBe(`Mon deck — ${DECK_FORMAT_LABELS['normal']}`)
    expect(lines[1]).toBe('2 cartes')
  })

  it('regroupe par type dans l’ordre du jeu, pas par ordre d’ajout', () => {
    const out = formatDeckExport('D', 'normal', [
      entry('Objet A', '010', 'Objet', 1),
      entry('Perso A', '001', 'Personnage', 1),
    ])
    expect(out.indexOf('Personnage')).toBeLessThan(out.indexOf('Objet'))
  })

  it('trie les cartes par nom dans chaque type', () => {
    const out = formatDeckExport('D', 'normal', [
      entry('Zephyr', '002', 'Personnage', 1),
      entry('Aile', '001', 'Personnage', 3),
    ])
    expect(out.indexOf('3x Aile #001')).toBeLessThan(out.indexOf('1x Zephyr #002'))
  })

  it('range les cartes sans type dans « Autre » en dernier', () => {
    const out = formatDeckExport('D', 'normal', [
      entry('Sans type', '099', null, 1),
      entry('Perso', '001', 'Personnage', 1),
    ])
    expect(out.indexOf('Personnage')).toBeLessThan(out.indexOf('Autre'))
    expect(out).toContain('1x Sans type #099')
  })

  it('se termine par une seule fin de ligne', () => {
    const out = formatDeckExport('D', 'normal', [entry('X', '001', 'Personnage', 1)])
    expect(out.endsWith('\n')).toBe(true)
    expect(out.endsWith('\n\n')).toBe(false)
  })
})

describe('deckExportFilename', () => {
  it('slugifie nom accentué et espaces', () => {
    expect(deckExportFilename('Mon Deck Éclaireur')).toBe('mon-deck-eclaireur.txt')
  })

  it('retombe sur « deck » quand le slug est vide', () => {
    expect(deckExportFilename('   ')).toBe('deck.txt')
    expect(deckExportFilename('!!!')).toBe('deck.txt')
  })

  it('nettoie les tirets en bord', () => {
    expect(deckExportFilename('  -Aggro-  ')).toBe('aggro.txt')
  })
})
