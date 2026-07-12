import type { Card } from '@/types/card'
import type { DeckEntry, DeckFormat } from '@/types/deck'
import { DECK_FORMAT_RULES } from '@/types/deck'

function countCopiesByName(entries: DeckEntry[], name: string): number {
  return entries.filter((e) => e.card.name === name).reduce((sum, e) => sum + e.quantity, 0)
}

export function getMaxCopiesForCard(card: Card, format: DeckFormat): number {
  const rules = DECK_FORMAT_RULES[format]
  if (card.type === 'Environnement') return rules.environnementCount
  if (card.type === 'Artefact') return rules.artefactCount
  return rules.maxCopies
}

export function canAddCard(entries: DeckEntry[], card: Card, format: DeckFormat): boolean {
  return countCopiesByName(entries, card.name) < getMaxCopiesForCard(card, format)
}

function getOverLimitCardNames(entries: DeckEntry[], format: DeckFormat): string[] {
  const byName = new Map<string, { total: number; max: number }>()
  for (const e of entries) {
    const current = byName.get(e.card.name) ?? { total: 0, max: getMaxCopiesForCard(e.card, format) }
    current.total += e.quantity
    byName.set(e.card.name, current)
  }
  return [...byName.entries()].filter(([, v]) => v.total > v.max).map(([name]) => name)
}

export interface DeckIssue {
  key: string
  label: string
  ok: boolean
}

export function getDeckIssues(entries: DeckEntry[], format: DeckFormat): DeckIssue[] {
  const rules = DECK_FORMAT_RULES[format]

  const totalCards = entries.reduce((sum, e) => sum + e.quantity, 0)
  const environnementCount = entries
    .filter((e) => e.card.type === 'Environnement')
    .reduce((sum, e) => sum + e.quantity, 0)
  const artefactCount = entries.filter((e) => e.card.type === 'Artefact').reduce((sum, e) => sum + e.quantity, 0)
  const distinctAspirants = new Set(entries.filter((e) => e.card.subtype === 'Aspirant').map((e) => e.card.name)).size
  const overLimitNames = getOverLimitCardNames(entries, format)

  return [
    { key: 'size', label: `${totalCards}/${rules.size} cartes`, ok: totalCards === rules.size },
    {
      key: 'copies',
      label:
        overLimitNames.length === 0
          ? "Nombre d'exemplaires respecté"
          : `Trop d'exemplaires : ${overLimitNames.join(', ')}`,
      ok: overLimitNames.length === 0,
    },
    {
      key: 'environnement',
      label: `Environnement : ${environnementCount}/${rules.environnementCount}`,
      ok: environnementCount === rules.environnementCount,
    },
    {
      key: 'artefact',
      label: `Artefact : ${artefactCount}/${rules.artefactCount}`,
      ok: artefactCount === rules.artefactCount,
    },
    {
      key: 'aspirants',
      label: `Aspirants différents : ${distinctAspirants}/${rules.minDistinctAspirants}+`,
      ok: distinctAspirants >= rules.minDistinctAspirants,
    },
  ]
}

export function isDeckLegal(entries: DeckEntry[], format: DeckFormat): boolean {
  return getDeckIssues(entries, format).every((issue) => issue.ok)
}
