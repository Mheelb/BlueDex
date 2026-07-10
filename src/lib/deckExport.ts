import { CARD_TYPES } from '@/types/card'
import type { DeckEntry, DeckFormat } from '@/types/deck'
import { DECK_FORMAT_LABELS } from '@/types/deck'

// Regroupe les cartes par type dans l'ordre du jeu (CARD_TYPES) plutôt que
// par ordre d'ajout, pour que la liste exportée se lise comme une decklist
// plutôt que comme un historique de clics.
export function formatDeckExport(name: string, format: DeckFormat, entries: DeckEntry[]): string {
  const total = entries.reduce((sum, e) => sum + e.quantity, 0)
  const lines = [`${name} — ${DECK_FORMAT_LABELS[format]}`, `${total} cartes`, '']

  const byType = new Map<string, DeckEntry[]>()
  for (const entry of entries) {
    const type = entry.card.type ?? 'Autre'
    const bucket = byType.get(type)
    if (bucket) bucket.push(entry)
    else byType.set(type, [entry])
  }

  for (const type of [...CARD_TYPES, 'Autre']) {
    const bucket = byType.get(type)
    if (!bucket || bucket.length === 0) continue

    lines.push(type)
    for (const entry of [...bucket].sort((a, b) => a.card.name.localeCompare(b.card.name))) {
      lines.push(`${entry.quantity}x ${entry.card.name} #${entry.card.number}`)
    }
    lines.push('')
  }

  return `${lines.join('\n').trim()}\n`
}

export function deckExportFilename(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'deck'}.txt`
}
