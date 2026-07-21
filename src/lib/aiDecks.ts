import type { DeckEntry } from '@/types/deck'
import {
  ART_ECUYER,
  ART_GARDIEN,
  CARTES,
  DECK_ECUYER,
  DECK_GARDIEN,
  ENV_ECUYER,
  ENV_GARDIEN,
  type Carte,
} from '@/game-ai/cartes'

/** Un deck au format moteur : liste d'IDs (numéros BR1) + environnement + artefact. */
export interface EngineDeck {
  name: string
  deck: number[]
  env: number
  art: number
}

/** Decks de test intégrés au moteur (effets pleinement implémentés). */
export const PRESET_DECKS: EngineDeck[] = [
  { name: 'Écuyer Swarm (test)', deck: DECK_ECUYER, env: ENV_ECUYER, art: ART_ECUYER },
  { name: 'Gardien — Rouleau Compresseur (test)', deck: DECK_GARDIEN, env: ENV_GARDIEN, art: ART_GARDIEN },
]

export interface DeckConversion {
  deck: EngineDeck | null
  issues: string[]
}

/**
 * Convertit un deck de la BDD (numéros de carte du set BR1) en deck moteur.
 * Les cartes hors des 120 cartes connues du moteur sont ignorées (signalées).
 */
export function dbDeckToEngine(name: string, entries: DeckEntry[]): DeckConversion {
  const issues: string[] = []
  const deck: number[] = []
  let env: number | null = null
  let art: number | null = null

  for (const entry of entries) {
    const id = Number.parseInt(entry.card.number, 10)
    const carte: Carte | undefined = Number.isFinite(id) ? CARTES[id] : undefined
    if (!carte) {
      issues.push(`Inconnue du moteur : ${entry.card.name} (n°${entry.card.number})`)
      continue
    }
    for (let k = 0; k < entry.quantity; k++) {
      if (carte.type === 'environnement') {
        if (env === null) env = id
        else issues.push('Plusieurs Environnements — seul le premier est gardé.')
      } else if (carte.type === 'artefact') {
        if (art === null) art = id
        else issues.push('Plusieurs Artefacts — seul le premier est gardé.')
      } else {
        deck.push(id)
      }
    }
  }

  if (env === null) issues.push('Aucun Environnement reconnu par le moteur.')
  if (art === null) issues.push('Aucun Artefact reconnu par le moteur.')
  const aspirants = new Set(deck.filter((id) => CARTES[id]?.sousType === 'aspirant'))
  if (aspirants.size < 4) issues.push(`Moins de 4 Aspirants distincts connus (${aspirants.size}).`)

  const ok = env !== null && art !== null && aspirants.size >= 4
  return { deck: ok ? { name, deck, env: env!, art: art! } : null, issues }
}

/** Infos d'une carte moteur par son id (pour l'affichage). */
export function carteInfo(id: number): Carte | undefined {
  return CARTES[id]
}
