import type { Card } from '@/types/card'
import type { DeckFormat } from '@/types/deck'

export type PlayerId = 'a' | 'b'

export const PLAYER_IDS: PlayerId[] = ['a', 'b']

/** Instance physique d'une carte en jeu (une même Card peut exister en plusieurs exemplaires). */
export interface GameCard {
  uid: string
  card: Card
  /** Carte inclinée (activée / attaquante). */
  tapped: boolean
  faceDown: boolean
  /** Bonus de puissance temporaire, remis à zéro en fin de tour. */
  tempPower: number
  /** Objets équipés sur ce personnage. */
  attached: GameCard[]
  /** Désorientation : personnage fraîchement joué, ne peut ni attaquer ni s'activer ce tour. */
  sick: boolean
}

/** Emplacements manipulables sur le plateau. */
export type Zone = 'draw' | 'hand' | 'discard' | 'front' | 'back' | 'traps' | 'environnement' | 'artefact'

export interface PlayerState {
  id: PlayerId
  name: string
  deckName: string
  drawPile: GameCard[]
  hand: GameCard[]
  discard: GameCard[]
  front: (GameCard | null)[]
  back: (GameCard | null)[]
  traps: (GameCard | null)[]
  environnement: GameCard | null
  artefact: GameCard | null
  resources: number
  victoryPoints: number
  mulliganed: boolean
}

export const PHASES = ['debut', 'principale', 'fin'] as const
export type Phase = (typeof PHASES)[number]

export const PHASE_LABELS: Record<Phase, string> = {
  debut: 'Début de tour',
  principale: 'Phase principale',
  fin: 'Fin de tour',
}

export interface GameConfig {
  format: DeckFormat
  /** Points de victoire pour gagner. */
  victoryTarget: number
  /** Nombre d'Aspirants distincts posés au départ. */
  aspirantsInPlay: number
  /** Nombre de cartes en main de départ pour le 1er joueur / l'adversaire. */
  startingHand: { first: number; second: number }
}

export const GAME_CONFIGS: Record<DeckFormat, GameConfig> = {
  normal: { format: 'normal', victoryTarget: 5, aspirantsInPlay: 4, startingHand: { first: 3, second: 5 } },
  rapide: { format: 'rapide', victoryTarget: 3, aspirantsInPlay: 3, startingHand: { first: 3, second: 5 } },
}

export type GameStatus = 'toss' | 'playing'

export interface GameState {
  config: GameConfig
  players: Record<PlayerId, PlayerState>
  /** 'toss' : le premier joueur n'est pas encore désigné. 'playing' : partie en cours. */
  status: GameStatus
  activePlayer: PlayerId
  /** Premier joueur désigné par le toss ; null tant que le toss n'a pas eu lieu. */
  firstPlayer: PlayerId | null
  turn: number
  phase: Phase
  log: string[]
  winner: PlayerId | null
}

/** Pointeur vers une carte instanciée dans une zone donnée. */
export interface CardRef {
  player: PlayerId
  zone: Zone
  /** Index dans les zones à emplacements (front/back/traps) ou dans les piles (hand/discard/draw). */
  index: number
}
