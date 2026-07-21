import type { Card } from '@/types/card'
import type { DeckEntry } from '@/types/deck'
import type { GameCard, GameConfig, PlayerId, PlayerState } from '@/types/game'

let uidCounter = 0
function nextUid(): string {
  uidCounter += 1
  return `gc-${uidCounter}-${Math.floor(Math.random() * 1e6)}`
}

export function makeGameCard(card: Card, faceDown = false): GameCard {
  return { uid: nextUid(), card, tapped: false, faceDown, tempPower: 0, attached: [], sick: false }
}

let tokenCounter = 0

/** Crée un jeton Écuyer (personnage sans coût, 0 PV à la destruction). */
export function makeEcuyerToken(power: number, support: number): GameCard {
  tokenCounter += 1
  const card: Card = {
    id: `ecuyer-token-${tokenCounter}`,
    set_id: '',
    number: 'TOKEN',
    name: 'Écuyer',
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
    cost: 0,
    power,
    support,
    effect: null,
    artist: null,
  }
  return makeGameCard(card)
}

/** Mélange une copie du tableau (Fisher–Yates). */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Développe les entrées d'un deck (carte × quantité) en instances de jeu. */
export function expandEntries(entries: DeckEntry[]): GameCard[] {
  const cards: GameCard[] = []
  for (const entry of entries) {
    for (let i = 0; i < entry.quantity; i++) cards.push(makeGameCard(entry.card))
  }
  return cards
}

export function isAspirant(card: Card): boolean {
  return card.type === 'Personnage' && card.subtype === 'Aspirant'
}

/** Aspirants distincts (par nom) disponibles dans un deck, pour le choix de départ. */
export function distinctAspirants(entries: DeckEntry[]): Card[] {
  const seen = new Set<string>()
  const out: Card[] = []
  for (const entry of entries) {
    if (isAspirant(entry.card) && !seen.has(entry.card.name)) {
      seen.add(entry.card.name)
      out.push(entry.card)
    }
  }
  return out
}

export interface DeckSetupIssue {
  ok: boolean
  messages: string[]
}

/** Vérifie qu'un deck contient de quoi démarrer une partie dans ce format. */
export function validateDeckForGame(entries: DeckEntry[], config: GameConfig): DeckSetupIssue {
  const messages: string[] = []
  const envCount = entries.filter((e) => e.card.type === 'Environnement').reduce((s, e) => s + e.quantity, 0)
  const artefactCount = entries.filter((e) => e.card.type === 'Artefact').reduce((s, e) => s + e.quantity, 0)
  const aspirants = distinctAspirants(entries).length

  if (envCount < 1) messages.push('Aucun Environnement dans le deck.')
  if (config.format === 'normal' && artefactCount < 1) messages.push('Aucun Artefact dans le deck.')
  if (aspirants < config.aspirantsInPlay)
    messages.push(`Il faut au moins ${config.aspirantsInPlay} Aspirants distincts (trouvés : ${aspirants}).`)

  return { ok: messages.length === 0, messages }
}

export interface BuildSideOptions {
  id: PlayerId
  name: string
  deckName: string
  entries: DeckEntry[]
  config: GameConfig
  /** Ids des cartes Aspirant à poser en jeu ; sinon, les premiers distincts sont choisis. */
  chosenAspirantIds?: string[]
}

/**
 * Construit l'état d'un camp à partir d'un deck : extrait l'Environnement,
 * l'Artefact et les Aspirants de départ, puis mélange le reste en pioche.
 */
export function buildSide(options: BuildSideOptions): PlayerState {
  const { id, name, deckName, entries, config } = options
  const pool = expandEntries(entries)

  const take = (predicate: (c: GameCard) => boolean): GameCard | null => {
    const idx = pool.findIndex(predicate)
    if (idx === -1) return null
    return pool.splice(idx, 1)[0]
  }

  const environnement = take((c) => c.card.type === 'Environnement')
  const artefact = config.format === 'normal' ? take((c) => c.card.type === 'Artefact') : null
  if (artefact) artefact.faceDown = true

  // Choix des Aspirants de départ.
  let aspirantIds = options.chosenAspirantIds
  if (!aspirantIds || aspirantIds.length === 0) {
    aspirantIds = distinctAspirants(entries)
      .slice(0, config.aspirantsInPlay)
      .map((c) => c.id)
  }

  // Les Aspirants de départ remplissent la ligne avant (3 cases) puis débordent
  // sur la ligne arrière (le 4ᵉ en Normal). Le joueur peut ensuite les déplacer.
  const front: (GameCard | null)[] = [null, null, null]
  const back: (GameCard | null)[] = [null, null, null]
  aspirantIds.slice(0, config.aspirantsInPlay).forEach((cardId, slot) => {
    const inst = take((c) => c.card.id === cardId)
    if (!inst) return
    inst.faceDown = false // révélés au démarrage (étape 9 de la mise en place)
    if (slot < front.length) front[slot] = inst
    else if (slot - front.length < back.length) back[slot - front.length] = inst
  })

  return {
    id,
    name,
    deckName,
    drawPile: shuffle(pool),
    hand: [],
    discard: [],
    front,
    back,
    traps: [null, null, null],
    environnement,
    artefact,
    resources: 0,
    victoryPoints: 0,
    mulliganed: false,
  }
}

/** Points de victoire rapportés par la destruction d'un personnage selon son grade. */
export function gradePoints(card: Card): number {
  if (card.name === 'Écuyer') return 0 // un Écuyer détruit ne rapporte rien
  if (card.subtype === 'Légende') return 2
  return 1
}
