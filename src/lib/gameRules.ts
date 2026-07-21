import type { Card, Faction } from '@/types/card'
import type { CardRef, GameCard, GameState, PlayerId, Zone } from '@/types/game'

// ---------------------------------------------------------------------------
// Mots-clés — extraits du texte d'effet (structuré, réutilisable pour le combat).
// ---------------------------------------------------------------------------

export interface Keywords {
  rage: boolean
  furtif: boolean
  resistant: boolean
  contreAttaque: boolean
  distance: boolean
  avant: number
  arriere: number
  defense: number
  attaque: number
}

export function parseKeywords(effect: string | null | undefined): Keywords {
  const t = (effect ?? '').toLowerCase()
  const num = (re: RegExp): number => {
    const m = t.match(re)
    return m ? Number.parseInt(m[1], 10) : 0
  }
  return {
    rage: /\brage\b/.test(t),
    furtif: /furtif/.test(t),
    resistant: /r[ée]sistant/.test(t),
    contreAttaque: /contre[-\s]?attaque/.test(t),
    distance: /attaque\s+[àa]\s+distance/.test(t),
    avant: num(/avant\s*\+\s*(\d+)/),
    arriere: num(/arri[èe]re\s*\+\s*(\d+)/),
    defense: num(/d[ée]fense\s*\+\s*(\d+)/),
    attaque: num(/attaque\s*\+\s*(\d+)/),
  }
}

// ---------------------------------------------------------------------------
// Capacités activées (:rotation: = incliner pour activer)
// ---------------------------------------------------------------------------

export interface ActivatedAbility {
  /** La carte porte une capacité activée (:rotation:). */
  present: boolean
  /** Ressources générées automatiquement à l'activation. */
  gainResources: number
  /** Cartes piochées automatiquement à l'activation. */
  draw: number
  /** Effet activé non automatisable → à appliquer à la main. */
  manual: boolean
}

export function parseActivated(effect: string | null | undefined): ActivatedAbility {
  const t = effect ?? ''
  if (!/:rotation:/i.test(t)) return { present: false, gainResources: 0, draw: 0, manual: false }

  // On ne lit que la portion qui suit le symbole d'activation.
  const after = t.split(/:rotation:/i)[1] ?? ''
  const resM = after.match(/gagnez?\s+(\d+)\s+ressource/i)
  const drawM = after.match(/pioch\w*\s+(\d+)?\s*carte/i)
  const gainResources = resM ? Number.parseInt(resM[1], 10) : 0
  const draw = drawM ? (drawM[1] ? Number.parseInt(drawM[1], 10) : 1) : 0

  return { present: true, gainResources, draw, manual: gainResources === 0 && draw === 0 }
}

// ---------------------------------------------------------------------------
// Buffs de puissance (Événements)
// ---------------------------------------------------------------------------

const FACTION_WORDS: { re: RegExp; faction: Faction }[] = [
  { re: /gardien/i, faction: 'Gardien' },
  { re: /[ée]missaire/i, faction: 'Émissaire' },
  { re: /veilleur/i, faction: 'Veilleur' },
  { re: /[ée]claireur/i, faction: 'Éclaireur' },
]

/** Extrait un bonus de faction « FACTION: Puissance +X » du texte. */
export function matchFactionPowerBonus(text: string): { faction: Faction; amount: number } | null {
  const m = text.match(/(gardien|[ée]missaire|veilleur|[ée]claireur)\s*:\s*puissance\s*\+\s*(\d+)/i)
  if (!m) return null
  const faction = FACTION_WORDS.find((f) => f.re.test(m[1]))?.faction
  return faction ? { faction, amount: Number.parseInt(m[2], 10) } : null
}

export interface PowerBuff {
  /** Bonus de puissance de base. */
  amount: number
  /** 'target' : un personnage au choix ; 'all-allies' : tous tes personnages. */
  scope: 'target' | 'all-allies' | null
  /** Bonus supplémentaire si la cible appartient à la faction. */
  factionBonus: { faction: Faction; amount: number } | null
}

/** Extrait un buff de puissance auto-applicable depuis le texte d'un Événement. */
export function parsePowerBuff(effect: string | null | undefined): PowerBuff {
  const t = effect ?? ''
  const none: PowerBuff = { amount: 0, scope: null, factionBonus: null }

  const amountM = t.match(/puissance\s*\+\s*(\d+)/i) ?? t.match(/\+\s*(\d+)\s*(?:en\s+)?puissance/i)
  if (!amountM) return none
  const amount = Number.parseInt(amountM[1], 10)

  let scope: PowerBuff['scope'] = null
  if (/tou[ts]+\s+(?:vos|les|mes)?\s*(?:personnages|[ée]cuyers)/i.test(t)) scope = 'all-allies'
  else if (/un personnage/i.test(t)) scope = 'target'
  if (!scope) return none

  // Bonus de faction : « GARDIEN: Puissance +2 » (distinct du bonus principal).
  return { amount, scope, factionBonus: matchFactionPowerBonus(t) }
}

/** Action d'Événement automatisable. */
export type EventActionKind = 'buff' | 'untap' | 'return' | 'destroy' | 'draw' | 'gainResources'

export interface EventAction {
  kind: EventActionKind
  /** 'target' : cible à choisir · 'all-allies' : tous tes personnages · 'self' : immédiat sur toi. */
  scope: 'target' | 'all-allies' | 'self'
  buff: PowerBuff | null
  /** Nombre (pioche / ressources). */
  amount: number
  /** Type de cible pour une destruction. */
  targetType: 'personnage' | 'piege'
}

export function parseEventAction(effect: string | null | undefined): EventAction | null {
  const t = effect ?? ''
  const base = { buff: null as PowerBuff | null, amount: 0, targetType: 'personnage' as const }

  // Buff de puissance (a une valeur chiffrée) : prioritaire.
  const buff = parsePowerBuff(t)
  if (buff.scope) return { ...base, kind: 'buff', scope: buff.scope, buff }

  // Redressement.
  if (/redressez/i.test(t)) {
    if (/tous/i.test(t)) return { ...base, kind: 'untap', scope: 'all-allies' }
    if (/un personnage/i.test(t)) return { ...base, kind: 'untap', scope: 'target' }
  }

  // Renvoi en main (mono-cible ; « chaque joueur »/« tous » = multi → manuel).
  if (/(renvoie|renvoyez)/i.test(t) && !/tous|chaque/i.test(t)) {
    if (/un personnage|le personnage|le d[ée]fenseur|l['’]attaquant/i.test(t))
      return { ...base, kind: 'return', scope: 'target' }
  }

  // Destruction ciblée (forme impérative « détruisez… »).
  if (/d[ée]truisez/i.test(t)) {
    return { ...base, kind: 'destroy', scope: 'target', targetType: /pi[èe]ge/i.test(t) ? 'piege' : 'personnage' }
  }

  // Effets immédiats « purs » (tout le texte se résume à l'action).
  const drawPure = t.match(/^\s*piochez\s+(\d+)\s+cartes?\.?\s*$/i)
  if (drawPure) return { ...base, kind: 'draw', scope: 'self', amount: Number.parseInt(drawPure[1], 10) }
  const gainPure = t.match(/^\s*gagnez\s+(\d+)\s+ressources?\.?\s*$/i)
  if (gainPure) return { ...base, kind: 'gainResources', scope: 'self', amount: Number.parseInt(gainPure[1], 10) }

  return null
}

/** L'effet activé (:rotation:) est-il un échange d'emplacement ? */
export function isSwapAbility(effect: string | null | undefined): boolean {
  return /[ée]change.*emplacement/i.test(effect ?? '')
}

/** Création de jetons Écuyers : « Créez jusqu'à N Écuyers (P S) ». */
export function parseEcuyers(
  effect: string | null | undefined,
): { count: number; power: number; support: number } | null {
  const m = (effect ?? '').match(/cr[ée]ez\s+(?:jusqu['’]?\s*[àa]\s+)?(\d+)\s+[ée]cuyers?\s*\(\s*(\d+)\s+(\d+)\s*\)/i)
  if (!m) return null
  return { count: Number.parseInt(m[1], 10), power: Number.parseInt(m[2], 10), support: Number.parseInt(m[3], 10) }
}

/** Puissance permanente conférée par un objet équipé (« le personnage équipé gagne Puissance +X »). */
export function parseEquipPower(effect: string | null | undefined): number {
  const m = (effect ?? '').match(/[ée]quip[ée]\s+gagne\s+puissance\s*\+\s*(\d+)/i)
  return m ? Number.parseInt(m[1], 10) : 0
}

/** Réduction de coût conditionnée par une faction (« ÉMISSAIRE : Coût -1 » / « Ne payez pas le coût »). */
export function parseFactionCostReduction(
  effect: string | null | undefined,
): { faction: Faction; amount: number } | null {
  const t = effect ?? ''
  const facRe = /(gardien|[ée]missaire|veilleur|[ée]claireur)/i
  const factionFrom = (word: string) => FACTION_WORDS.find((f) => f.re.test(word))?.faction ?? null

  const noPay = t.match(new RegExp(facRe.source + /\s*:\s*ne\s+payez\s+pas\s+le\s+co[ûu]t/i.source, 'i'))
  if (noPay) {
    const faction = factionFrom(noPay[1])
    if (faction) return { faction, amount: Number.POSITIVE_INFINITY }
  }
  const m = t.match(new RegExp(facRe.source + /\s*:\s*co[ûu]t\s*[-−]\s*(\d+)/i.source, 'i'))
  if (m) {
    const faction = factionFrom(m[1])
    if (faction) return { faction, amount: Number.parseInt(m[2], 10) }
  }
  return null
}

/** Coût effectif d'une carte compte tenu d'une éventuelle réduction de faction (ex. objet sur un porteur). */
export function effectiveCost(card: Card, contextFaction: Faction | null): number {
  const base = playCost(card)
  const red = parseFactionCostReduction(card.effect)
  if (red && contextFaction && contextFaction === red.faction) return Math.max(0, base - red.amount)
  return base
}

// ---------------------------------------------------------------------------
// Quêtes d'Artefact (« condition > effet »)
// ---------------------------------------------------------------------------

export interface ArtefactQuest {
  condition: string
  effectText: string
  /** Effets automatisables détectés. */
  draw: number
  shuffleDiscardIntoDeck: boolean
  untapAll: boolean
}

export function parseArtefact(effect: string | null | undefined): ArtefactQuest | null {
  const t = (effect ?? '').trim()
  const idx = t.indexOf('>')
  if (idx === -1) return null
  const condition = t.slice(0, idx).trim()
  const effectText = t.slice(idx + 1).trim()
  const drawM = effectText.match(/pioch\w*\s+(\d+)\s*carte/i)
  return {
    condition,
    effectText,
    draw: drawM ? Number.parseInt(drawM[1], 10) : 0,
    shuffleDiscardIntoDeck: /d[ée]fausse.+(?:dans|deck)/i.test(effectText) && /deck/i.test(effectText),
    untapAll: /redressez\s+tous/i.test(effectText),
  }
}

export interface DefenderBuff {
  amount: number
  factionBonus: { faction: Faction; amount: number } | null
}

/** Buff de puissance appliqué au défenseur (pièges révélés en combat). */
export function parseDefenderBuff(effect: string | null | undefined): DefenderBuff | null {
  const t = effect ?? ''
  const m = t.match(/le\s+d[ée]fenseur\s+gagne\s+puissance\s*\+\s*(\d+)/i)
  if (!m) return null
  return { amount: Number.parseInt(m[1], 10), factionBonus: matchFactionPowerBonus(t) }
}

// ---------------------------------------------------------------------------
// Légalité des actions
// ---------------------------------------------------------------------------

export interface LegalityCheck {
  ok: boolean
  reason?: string
}

const OK: LegalityCheck = { ok: true }
const opponentOf = (id: PlayerId): PlayerId => (id === 'a' ? 'b' : 'a')

/** Grades soumis à la règle d'unicité (un seul exemplaire en jeu simultanément). */
const UNIQUE_SUBTYPES = ['Aspirant', 'Héros', 'Légende']

export function playCost(card: Card): number {
  return card.cost ?? 0
}

function nameInPlay(front: (GameCard | null)[], back: (GameCard | null)[], name: string): boolean {
  return [...front, ...back].some((s) => s !== null && s.card.name === name)
}

/** Le joueur peut-il jouer cette carte depuis sa main dans l'état courant ? */
export function canPlayFromHand(g: GameState, playerId: PlayerId, card: Card): LegalityCheck {
  if (g.status !== 'playing') return { ok: false, reason: 'Partie non démarrée.' }
  if (g.winner) return { ok: false, reason: 'Partie terminée.' }
  if (g.activePlayer !== playerId) return { ok: false, reason: "Ce n'est pas ton tour." }
  if (g.phase !== 'principale') return { ok: false, reason: 'Uniquement en phase principale.' }

  const p = g.players[playerId]
  const type = card.type

  // Un Piège se pose face cachée sans payer son coût (payé à la révélation).
  if (type === 'Piège') {
    if (!p.traps.some((s) => s === null)) return { ok: false, reason: 'Aucun emplacement de piège libre.' }
    return OK
  }

  // Un Objet : coût potentiellement réduit selon la faction du porteur choisi.
  if (type === 'Objet') {
    const hosts = [...p.front, ...p.back].filter((s): s is GameCard => s?.card.type === 'Personnage')
    if (!hosts.length) return { ok: false, reason: 'Aucun personnage à équiper.' }
    const minCost = Math.min(...hosts.map((h) => effectiveCost(card, h.card.faction)))
    if (p.resources < minCost) return { ok: false, reason: `Coût ${minCost}, ressources ${p.resources}.` }
    return OK
  }

  const cost = playCost(card)
  if (p.resources < cost) return { ok: false, reason: `Coût ${cost}, ressources ${p.resources}.` }

  if (type === 'Personnage') {
    if (UNIQUE_SUBTYPES.includes(card.subtype ?? '') && nameInPlay(p.front, p.back, card.name))
      return { ok: false, reason: `« ${card.name} » est déjà en jeu (unicité).` }
    if (card.subtype === 'Légende' && g.players[opponentOf(playerId)].victoryPoints < 1)
      return { ok: false, reason: "Légende jouable seulement si l'adversaire a ≥ 1 PV." }
  }

  return OK
}

/** Emplacements où la carte peut être posée (cases de destination légales). */
export function legalPlayZones(g: GameState, playerId: PlayerId, card: Card): CardRef[] {
  const p = g.players[playerId]
  const refs: CardRef[] = []
  const push = (zone: Zone, index: number) => refs.push({ player: playerId, zone, index })

  switch (card.type) {
    case 'Personnage':
      // Tout emplacement de ligne, vide ou occupé (remplacement autorisé).
      p.front.forEach((_, i) => push('front', i))
      p.back.forEach((_, i) => push('back', i))
      break
    case 'Objet':
      // Sur un personnage du plateau qu'on peut s'offrir (coût réduit selon sa faction).
      p.front.forEach(
        (s, i) =>
          s?.card.type === 'Personnage' && p.resources >= effectiveCost(card, s.card.faction) && push('front', i),
      )
      p.back.forEach(
        (s, i) =>
          s?.card.type === 'Personnage' && p.resources >= effectiveCost(card, s.card.faction) && push('back', i),
      )
      break
    case 'Piège':
      p.traps.forEach((s, i) => s === null && push('traps', i))
      break
    case 'Environnement':
      push('environnement', 0)
      break
    case 'Artefact':
      push('artefact', 0)
      break
    case 'Événement':
      // Pas d'emplacement : se résout puis part à la défausse.
      break
  }
  return refs
}

export function isLegalPlayTarget(g: GameState, playerId: PlayerId, card: Card, zone: Zone, index: number): boolean {
  if (!canPlayFromHand(g, playerId, card).ok) return false
  return legalPlayZones(g, playerId, card).some((r) => r.zone === zone && r.index === index)
}

/** Ce personnage peut-il être déclaré attaquant ? */
export function canAttack(g: GameState, playerId: PlayerId, gc: GameCard): LegalityCheck {
  if (g.status !== 'playing') return { ok: false, reason: 'Partie non démarrée.' }
  if (g.winner) return { ok: false, reason: 'Partie terminée.' }
  if (g.activePlayer !== playerId) return { ok: false, reason: "Ce n'est pas ton tour." }
  if (g.phase !== 'principale') return { ok: false, reason: 'Uniquement en phase principale.' }
  if (gc.card.type !== 'Personnage') return { ok: false, reason: 'Seuls les personnages attaquent.' }
  if (gc.tapped) return { ok: false, reason: 'Déjà incliné.' }
  if (gc.sick && !parseKeywords(gc.card.effect).rage) return { ok: false, reason: 'Désorienté (joué ce tour).' }
  return OK
}
