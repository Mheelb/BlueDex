import { computed, ref } from 'vue'
import type { DeckEntry, DeckFormat } from '@/types/deck'
import {
  GAME_CONFIGS,
  PHASE_LABELS,
  type CardRef,
  type GameCard,
  type GameState,
  type Phase,
  type PlayerId,
  type PlayerState,
  type Zone,
} from '@/types/game'
import { buildSide, gradePoints, makeEcuyerToken, shuffle } from '@/lib/game'
import {
  canAttack,
  canPlayFromHand,
  effectiveCost,
  isLegalPlayTarget,
  type Keywords,
  isSwapAbility,
  parseActivated,
  parseArtefact,
  parseDefenderBuff,
  parseEcuyers,
  parseEventAction,
  type EventActionKind,
  parseEquipPower,
  parseKeywords,
  type PowerBuff,
  playCost,
} from '@/lib/gameRules'

/** Effet d'Événement en attente d'une cible. */
export interface PendingEffect {
  card: GameCard
  owner: PlayerId
  kind: EventActionKind
  buff: PowerBuff | null
  targetType: 'personnage' | 'piege'
}

/** Attaque en cours de résolution (machine à états guidée). */
export interface Combat {
  attacker: CardRef
  /** Colonne adverse ciblée (0-2), null tant qu'elle n'est pas choisie. */
  column: number | null
  /** Défenseur identifié (avant → arrière → environnement). */
  defender: CardRef | null
  attackerSupport: CardRef | null
  defenderSupport: CardRef | null
}

export interface CombatTotals {
  attackerName: string
  attackerFaction: string | null
  attackerPower: number
  defenderName: string
  defenderFaction: string | null
  defenderPower: number
  defenderIsEnv: boolean
  defenderContreAttaque: boolean
  attackerWins: boolean
}

export interface SideInput {
  name: string
  deckName: string
  entries: DeckEntry[]
  chosenAspirantIds?: string[]
}

const HAND_LIMIT = 5

/** Formulation du journal selon la zone de destination d'un déplacement. */
const MOVE_VERBS: Record<Zone, string> = {
  front: 'place en ligne avant',
  back: 'place en ligne arrière',
  traps: 'pose en piège',
  environnement: 'place en Environnement',
  artefact: 'place en Artefact',
  hand: 'reprend en main',
  discard: 'défausse',
  draw: 'remet sur le deck',
}

const state = ref<GameState | null>(null)
const selected = ref<CardRef | null>(null)
/** Débloque les deux camps (réactions : pièges, soutien, contre-attaque, résolution de combat). */
const freeMode = ref(false)
const combat = ref<Combat | null>(null)
const pendingEffect = ref<PendingEffect | null>(null)
/** Échange d'emplacement en attente : la carte source (activée) attend un allié. */
const pendingSwap = ref<CardRef | null>(null)

export function useGame() {
  const other = (id: PlayerId): PlayerId => (id === 'a' ? 'b' : 'a')

  /** Un camp est manipulable s'il est actif, ou si le mode libre est activé. */
  function canAct(playerId: PlayerId): boolean {
    const g = state.value
    if (!g || g.status !== 'playing') return false
    return freeMode.value || playerId === g.activePlayer
  }

  function log(message: string) {
    if (!state.value) return
    state.value.log.unshift(message)
    if (state.value.log.length > 200) state.value.log.pop()
  }

  function startGame(format: DeckFormat, sideA: SideInput, sideB: SideInput) {
    const config = GAME_CONFIGS[format]
    const players: Record<PlayerId, PlayerState> = {
      a: buildSide({ id: 'a', ...sideA, config }),
      b: buildSide({ id: 'b', ...sideB, config }),
    }

    state.value = {
      config,
      players,
      status: 'toss',
      activePlayer: 'a',
      firstPlayer: null,
      turn: 1,
      phase: 'debut',
      log: [],
      winner: null,
    }
    selected.value = null
    freeMode.value = false
    combat.value = null
    pendingEffect.value = null
    pendingSwap.value = null
    log('Toss pour désigner le premier joueur…')
  }

  /**
   * Effectue le toss : désigne le premier joueur, distribue les mains de départ
   * (3 pour le premier, 5 pour l'adversaire) et lance le tour 1.
   */
  function performToss(forced?: PlayerId): PlayerId {
    const g = state.value
    if (!g || g.status !== 'toss') return forced ?? 'a'

    const first: PlayerId = forced ?? (Math.random() < 0.5 ? 'a' : 'b')
    g.firstPlayer = first
    g.activePlayer = first
    g.status = 'playing'

    draw(first, g.config.startingHand.first)
    draw(other(first), g.config.startingHand.second)
    untapPersonnages(first)

    log(
      `Toss : ${g.players[first].name} commence (pioche ${g.config.startingHand.first}), ` +
        `${g.players[other(first)].name} pioche ${g.config.startingHand.second}.`,
    )
    log(`— Tour 1 · ${g.players[first].name} · ${PHASE_LABELS.debut}`)
    return first
  }

  function reset() {
    state.value = null
    selected.value = null
    freeMode.value = false
    combat.value = null
    pendingEffect.value = null
    pendingSwap.value = null
  }

  // --- Pioche & deck épuisé -------------------------------------------------

  function drawOne(playerId: PlayerId): boolean {
    const g = state.value
    if (!g) return false
    const p = g.players[playerId]

    if (p.drawPile.length === 0) {
      if (p.discard.length === 0) {
        log(`${p.name} ne peut plus piocher.`)
        return false
      }
      // Deck épuisé : la défausse est mélangée, l'adversaire gagne 1 PV.
      p.drawPile = shuffle(p.discard.map((c) => ({ ...c, tapped: false, faceDown: false, tempPower: 0 })))
      p.discard = []
      log(`Deck de ${p.name} épuisé : défausse remélangée, +1 PV pour l'adversaire.`)
      addVictoryPoints(other(playerId), 1)
    }

    const card = p.drawPile.shift()
    if (!card) return false
    card.faceDown = false
    p.hand.push(card)
    log(`${p.name} pioche ${card.card.name}.`)
    return true
  }

  function draw(playerId: PlayerId, n = 1) {
    for (let i = 0; i < n; i++) if (!drawOne(playerId)) break
  }

  function drawUpTo(playerId: PlayerId, target = HAND_LIMIT) {
    const g = state.value
    if (!g) return
    const p = g.players[playerId]
    let guard = 0
    while (p.hand.length < target && guard < target + 10) {
      if (!drawOne(playerId)) break
      guard++
    }
  }

  function mulligan(playerId: PlayerId) {
    const g = state.value
    if (!g) return
    const p = g.players[playerId]
    if (p.mulliganed) return
    const count = p.hand.length
    p.drawPile = shuffle([...p.drawPile, ...p.hand.map((c) => ({ ...c, faceDown: false }))])
    p.hand = []
    p.mulliganed = true
    draw(playerId, count)
    log(`${p.name} effectue un mulligan (${count} cartes).`)
  }

  // --- Zones : accès bas niveau --------------------------------------------

  function getCardAt(ref: CardRef): GameCard | null {
    const g = state.value
    if (!g) return null
    const p = g.players[ref.player]
    switch (ref.zone) {
      case 'draw':
        return p.drawPile[ref.index] ?? null
      case 'hand':
        return p.hand[ref.index] ?? null
      case 'discard':
        return p.discard[ref.index] ?? null
      case 'front':
        return p.front[ref.index] ?? null
      case 'back':
        return p.back[ref.index] ?? null
      case 'traps':
        return p.traps[ref.index] ?? null
      case 'environnement':
        return p.environnement
      case 'artefact':
        return p.artefact
    }
  }

  function removeAt(ref: CardRef): GameCard | null {
    const g = state.value
    if (!g) return null
    const p = g.players[ref.player]
    switch (ref.zone) {
      case 'draw':
        return p.drawPile.splice(ref.index, 1)[0] ?? null
      case 'hand':
        return p.hand.splice(ref.index, 1)[0] ?? null
      case 'discard':
        return p.discard.splice(ref.index, 1)[0] ?? null
      case 'front': {
        const c = p.front[ref.index]
        p.front[ref.index] = null
        return c
      }
      case 'back': {
        const c = p.back[ref.index]
        p.back[ref.index] = null
        return c
      }
      case 'traps': {
        const c = p.traps[ref.index]
        p.traps[ref.index] = null
        return c
      }
      case 'environnement': {
        const c = p.environnement
        p.environnement = null
        return c
      }
      case 'artefact': {
        const c = p.artefact
        p.artefact = null
        return c
      }
    }
  }

  function sendToDiscard(player: PlayerId, card: GameCard) {
    const g = state.value
    if (!g) return
    const p = g.players[player]
    // Les objets équipés partent aussi à la défausse.
    const detached = card.attached
    card.attached = []
    card.tapped = false
    card.faceDown = false
    card.tempPower = 0
    p.discard.push(card)
    for (const obj of detached) {
      obj.attached = []
      obj.tapped = false
      obj.faceDown = false
      obj.tempPower = 0
      p.discard.push(obj)
    }
  }

  /** Insère une carte dans une zone (même joueur). Gère le remplacement des emplacements. */
  function insertInto(player: PlayerId, zone: Zone, card: GameCard, index?: number) {
    const g = state.value
    if (!g) return
    const p = g.players[player]

    // Défausse l'occupant remplacé d'un emplacement, en le traçant.
    const replace = (occupant: GameCard | null) => {
      if (!occupant) return
      sendToDiscard(player, occupant)
      log(`${p.name} défausse ${occupant.card.name} (emplacement remplacé).`)
    }

    switch (zone) {
      case 'draw':
        card.faceDown = true
        p.drawPile.unshift(card)
        break
      case 'hand':
        card.faceDown = false
        card.tapped = false
        card.tempPower = 0
        p.hand.push(card)
        break
      case 'discard':
        sendToDiscard(player, card)
        break
      case 'front':
      case 'back': {
        const slots = zone === 'front' ? p.front : p.back
        const i = index ?? slots.findIndex((s) => s === null)
        const target = i >= 0 ? i : 0
        replace(slots[target])
        card.faceDown = false
        slots[target] = card
        break
      }
      case 'traps': {
        const i = index ?? p.traps.findIndex((s) => s === null)
        const target = i >= 0 ? i : 0
        replace(p.traps[target])
        card.faceDown = true
        p.traps[target] = card
        break
      }
      case 'environnement':
        replace(p.environnement)
        card.faceDown = false
        p.environnement = card
        break
      case 'artefact':
        replace(p.artefact)
        p.artefact = card
        break
    }
  }

  /** Déplace la carte pointée vers une zone du même joueur. */
  function moveCard(from: CardRef, toZone: Zone, toIndex?: number, opts?: { silent?: boolean }) {
    if (!canAct(from.player)) return
    const g = state.value
    const card = removeAt(from)
    if (!card) return
    insertInto(from.player, toZone, card, toIndex)
    if (!opts?.silent && g) {
      log(`${g.players[from.player].name} ${MOVE_VERBS[toZone]} ${card.card.name}.`)
    }
    selected.value = null
  }

  // --- Sélection & actions sur la carte sélectionnée ------------------------

  function select(ref: CardRef | null) {
    selected.value = ref
  }

  function sameRef(a: CardRef | null, b: CardRef | null): boolean {
    if (!a || !b) return false
    return a.player === b.player && a.zone === b.zone && a.index === b.index
  }

  function toggleSelect(ref: CardRef) {
    selected.value = sameRef(selected.value, ref) ? null : ref
  }

  function moveSelectedTo(toZone: Zone, toIndex?: number) {
    if (!selected.value) return
    moveCard(selected.value, toZone, toIndex)
  }

  function withSelected(fn: (card: GameCard, playerName: string) => void) {
    if (!selected.value || !canAct(selected.value.player)) return
    const g = state.value
    const card = getCardAt(selected.value)
    if (card && g) fn(card, g.players[selected.value.player].name)
  }

  function toggleTap() {
    withSelected((c, name) => {
      c.tapped = !c.tapped
      log(`${name} ${c.tapped ? 'incline' : 'redresse'} ${c.card.name}.`)
    })
  }

  function toggleFaceDown() {
    withSelected((c, name) => {
      c.faceDown = !c.faceDown
      log(`${name} ${c.faceDown ? 'retourne face cachée' : 'révèle'} ${c.card.name}.`)
    })
  }

  function addTempPower(delta: number) {
    withSelected((c, name) => {
      c.tempPower += delta
      const sign = c.tempPower > 0 ? '+' : ''
      log(`${name} : puissance de ${c.card.name} ${delta > 0 ? '+' : ''}${delta} (bonus ${sign}${c.tempPower}).`)
    })
  }

  /** Défausser la carte de main sélectionnée pour produire 1 ressource. */
  function discardForResource() {
    const ref = selected.value
    if (!ref || ref.zone !== 'hand' || !canAct(ref.player)) return
    const g = state.value
    if (!g) return
    const card = getCardAt(ref)
    moveCard(ref, 'discard', undefined, { silent: true })
    g.players[ref.player].resources += 1
    if (card)
      log(
        `${g.players[ref.player].name} défausse ${card.card.name} pour 1 ressource (${g.players[ref.player].resources}).`,
      )
  }

  /** Équipe l'objet sélectionné (en main) sur un personnage du plateau. */
  function attachSelectedTo(target: CardRef) {
    const ref = selected.value
    if (!ref || !canAct(ref.player) || !canAct(target.player)) return
    const obj = removeAt(ref)
    if (!obj) return
    const host = getCardAt(target)
    if (!host) {
      // pas d'hôte : on repose l'objet en main
      insertInto(ref.player, 'hand', obj)
      return
    }
    obj.faceDown = false
    // Un personnage ne porte qu'un seul objet : l'ancien part à la défausse.
    if (host.attached.length > 0) {
      const old = host.attached.splice(0)
      for (const o of old) sendToDiscard(target.player, o)
    }
    host.attached.push(obj)
    selected.value = null
    log(`${obj.card.name} équipé sur ${host.card.name}.`)
  }

  // --- Jeu guidé (légalité + coûts) -----------------------------------------

  /** Une carte de la main est-elle jouable dans l'état courant (surlignage) ? */
  function canPlayHandCard(ref: CardRef): boolean {
    const g = state.value
    if (!g || ref.zone !== 'hand') return false
    const gc = getCardAt(ref)
    return gc ? canPlayFromHand(g, ref.player, gc.card).ok : false
  }

  /** Une case du plateau est-elle une destination légale pour la carte de main sélectionnée ? */
  function isPlayTarget(handRef: CardRef, zone: Zone, index: number): boolean {
    const g = state.value
    if (!g || handRef.zone !== 'hand') return false
    const gc = getCardAt(handRef)
    return gc ? isLegalPlayTarget(g, handRef.player, gc.card, zone, index) : false
  }

  /** Ce personnage en jeu peut-il attaquer (surlignage / avertissement) ? */
  function attackable(ref: CardRef): boolean {
    const g = state.value
    if (!g) return false
    const gc = getCardAt(ref)
    return gc ? canAttack(g, ref.player, gc).ok : false
  }

  /**
   * Joue une carte de la main en appliquant les règles : coût, désorientation,
   * placement légal. `target` est requis sauf pour un Événement.
   */
  function playCard(handRef: CardRef, target?: CardRef) {
    const g = state.value
    if (!g || handRef.zone !== 'hand') return
    const owner = handRef.player
    const p = g.players[owner]
    const inst = getCardAt(handRef)
    if (!inst) return
    const card = inst.card
    const type = card.type

    const check = canPlayFromHand(g, owner, card)
    if (!check.ok) {
      log(`⛔ ${p.name} : ${check.reason}`)
      return
    }
    if (type !== 'Événement') {
      if (!target || !isLegalPlayTarget(g, owner, card, target.zone, target.index)) {
        log('⛔ Emplacement invalide.')
        return
      }
    }

    // Coût effectif : un Piège ne paie rien ; un Objet peut bénéficier d'une réduction de faction du porteur.
    let cost = type === 'Piège' ? 0 : playCost(card)
    if (type === 'Objet' && target) {
      const host = getCardAt(target)
      cost = host ? effectiveCost(card, host.card.faction) : cost
    }
    const played = removeAt(handRef)
    if (!played) return
    p.resources -= cost

    if (type === 'Objet' && target) {
      const host = getCardAt(target)
      if (!host) {
        insertInto(owner, 'hand', played)
        p.resources += cost
        return
      }
      if (host.attached.length > 0) {
        const old = host.attached.splice(0)
        for (const o of old) sendToDiscard(owner, o)
      }
      played.faceDown = false
      host.attached.push(played)
      log(`${p.name} équipe ${played.card.name} sur ${host.card.name} (coût ${cost}).`)
    } else if (type === 'Événement') {
      const action = parseEventAction(played.card.effect)
      if (action?.scope === 'target') {
        // Attente d'une cible : l'Événement est mis de côté puis défaussé après application.
        pendingEffect.value = {
          card: played,
          owner,
          kind: action.kind,
          buff: action.buff,
          targetType: action.targetType,
        }
        log(`${p.name} joue ${played.card.name} (coût ${cost}) — choisis la cible.`)
        selected.value = null
        return
      }
      if (action?.scope === 'all-allies') {
        let n = 0
        for (const slot of [...p.front, ...p.back]) {
          if (slot?.card.type !== 'Personnage') continue
          if (action.kind === 'buff' && action.buff) applyBuffToCard(slot, action.buff)
          else if (action.kind === 'untap') slot.tapped = false
          n++
        }
        const label = action.kind === 'untap' ? 'redresse' : `+${action.buff?.amount} puissance à`
        log(`${p.name} joue ${played.card.name} (coût ${cost}) : ${label} ${n} personnage(s).`)
      } else if (action?.kind === 'draw') {
        log(`${p.name} joue ${played.card.name} (coût ${cost}) : pioche ${action.amount}.`)
        draw(owner, action.amount)
      } else if (action?.kind === 'gainResources') {
        p.resources += action.amount
        log(`${p.name} joue ${played.card.name} (coût ${cost}) : +${action.amount} ressource(s) (${p.resources}).`)
      } else {
        log(`${p.name} joue l'événement ${played.card.name} (coût ${cost}) — applique l'effet à la main.`)
      }
      sendToDiscard(owner, played)
    } else if (type === 'Personnage' && target) {
      insertInto(owner, target.zone, played, target.index)
      played.sick = true
      log(
        `${p.name} joue ${played.card.name} (coût ${cost}) en ${target.zone === 'front' ? 'ligne avant' : 'ligne arrière'}.`,
      )
    } else if (type === 'Piège' && target) {
      insertInto(owner, 'traps', played, target.index)
      log(`${p.name} pose un piège face cachée (coût payé à la révélation).`)
    } else if (target) {
      insertInto(owner, target.zone, played, target.index)
      log(`${p.name} place ${played.card.name} (coût ${cost}).`)
    }

    selected.value = null
  }

  // --- Effets ciblés (buff de puissance) ------------------------------------

  function applyBuffToCard(gc: GameCard, buff: PowerBuff) {
    gc.tempPower += buff.amount
    if (buff.factionBonus && gc.card.faction === buff.factionBonus.faction) {
      gc.tempPower += buff.factionBonus.amount
    }
  }

  /** Une case est-elle une cible valide pour l'effet en attente ? */
  function isEffectTarget(ref: CardRef): boolean {
    const pe = pendingEffect.value
    if (!pe) return false
    const gc = getCardAt(ref)
    if (!gc) return false
    if (pe.targetType === 'piege') return ref.zone === 'traps'
    return gc.card.type === 'Personnage' && !gc.faceDown
  }

  /** Applique l'effet en attente au personnage ciblé puis défausse l'Événement. */
  function chooseEffectTarget(ref: CardRef) {
    const g = state.value
    const pe = pendingEffect.value
    if (!g || !pe || !isEffectTarget(ref)) return
    const target = getCardAt(ref)!
    const who = g.players[pe.owner].name

    if (pe.kind === 'buff' && pe.buff) {
      const before = target.tempPower
      applyBuffToCard(target, pe.buff)
      log(`${who} : ${target.card.name} gagne +${target.tempPower - before} puissance (${pe.card.card.name}).`)
      sendToDiscard(pe.owner, pe.card)
    } else if (pe.kind === 'untap') {
      target.tapped = false
      log(`${who} redresse ${target.card.name} (${pe.card.card.name}).`)
      sendToDiscard(pe.owner, pe.card)
    } else if (pe.kind === 'return') {
      const name = target.card.name
      sendToDiscard(pe.owner, pe.card)
      returnToHand(ref)
      log(`${who} renvoie ${name} en main (${pe.card.card.name}).`)
    } else if (pe.kind === 'destroy') {
      const name = target.card.name
      const removed = removeAt(ref)
      if (removed) sendToDiscard(ref.player, removed)
      sendToDiscard(pe.owner, pe.card)
      log(`${who} détruit ${name} (${pe.card.card.name}).`)
    }
    pendingEffect.value = null
  }

  // --- Échange d'emplacement (:rotation:) -----------------------------------

  /** Un allié valide pour l'échange d'emplacement en attente ? */
  function canSwapTarget(ref: CardRef): boolean {
    const src = pendingSwap.value
    if (!src) return false
    if (ref.player !== src.player) return false
    if (sameRef(ref, src)) return false
    const gc = getCardAt(ref)
    return !!gc && gc.card.type === 'Personnage' && (ref.zone === 'front' || ref.zone === 'back')
  }

  /** Échange les emplacements de la carte source (activée) et de la cible. */
  function chooseSwapTarget(ref: CardRef) {
    const g = state.value
    const src = pendingSwap.value
    if (!g || !src || !canSwapTarget(ref)) return
    const a = removeAt(src)
    const b = removeAt(ref)
    if (a) insertInto(ref.player, ref.zone, a, ref.index)
    if (b) insertInto(src.player, src.zone, b, src.index)
    if (a && b) log(`${g.players[src.player].name} échange ${a.card.name} et ${b.card.name}.`)
    pendingSwap.value = null
  }

  function cancelSwap() {
    pendingSwap.value = null
  }

  /** Annule l'effet en attente : l'Événement retourne en main et le coût est remboursé. */
  function cancelPendingEffect() {
    const g = state.value
    const pe = pendingEffect.value
    if (!g || !pe) return
    insertInto(pe.owner, 'hand', pe.card)
    g.players[pe.owner].resources += playCost(pe.card.card)
    pendingEffect.value = null
    log(`${g.players[pe.owner].name} annule ${pe.card.card.name}.`)
  }

  /** Crée jusqu'à `count` jetons Écuyers (P/S) dans les emplacements libres. */
  function createEcuyers(playerId: PlayerId, count: number, power: number, support: number) {
    const g = state.value
    if (!g) return
    const p = g.players[playerId]
    let made = 0
    const fill = (slots: (GameCard | null)[]) => {
      for (let i = 0; i < slots.length && made < count; i++) {
        if (!slots[i]) {
          const tok = makeEcuyerToken(power, support)
          tok.sick = true
          slots[i] = tok
          made++
        }
      }
    }
    fill(p.front)
    fill(p.back)
    if (made > 0) log(`${p.name} crée ${made} Écuyer(s) ${power}/${support}.`)
  }

  // --- Artefacts (quête) ----------------------------------------------------

  /** L'artefact du camp est-il révélable maintenant (posé, face cachée, contrôlé) ? */
  function isRevealableArtefact(ref: CardRef): boolean {
    if (ref.zone !== 'artefact' || !canAct(ref.player)) return false
    return !!getCardAt(ref)
  }

  /** Révèle l'Artefact, applique les effets automatisables, puis le retire du jeu. */
  function revealArtefact(playerId: PlayerId) {
    const g = state.value
    if (!g || !canAct(playerId)) return
    const p = g.players[playerId]
    const art = p.artefact
    if (!art) return

    art.faceDown = false
    log(`${p.name} révèle l'Artefact ${art.card.name}.`)
    const q = parseArtefact(art.card.effect)
    if (q) {
      log(`Quête : ${q.condition} → ${q.effectText}`)
      let auto = false
      if (q.draw > 0) {
        log(`${p.name} pioche ${q.draw} (Artefact).`)
        draw(playerId, q.draw)
        auto = true
      }
      if (q.shuffleDiscardIntoDeck) {
        p.drawPile = shuffle([
          ...p.drawPile,
          ...p.discard.map((c) => ({ ...c, tapped: false, faceDown: false, tempPower: 0 })),
        ])
        p.discard = []
        log(`${p.name} remélange sa défausse dans son deck.`)
        auto = true
      }
      if (q.untapAll) {
        for (const slot of [...p.front, ...p.back]) if (slot) slot.tapped = false
        log(`${p.name} redresse tous ses personnages.`)
        auto = true
      }
      const ecuyers = parseEcuyers(q.effectText)
      if (ecuyers) {
        createEcuyers(playerId, ecuyers.count, ecuyers.power, ecuyers.support)
        auto = true
      }
      if (!auto) log(`Effet à appliquer à la main : « ${q.effectText} »`)
    } else if (art.card.effect) {
      log(`Effet à appliquer à la main : « ${art.card.effect} »`)
    }

    p.artefact = null // retiré du jeu (règle)
    selected.value = null
  }

  // --- Capacités activées (:rotation:) --------------------------------------

  /** La carte pointée porte-t-elle une capacité activable maintenant ? */
  function hasActivatedAbility(ref: CardRef): boolean {
    const gc = getCardAt(ref)
    if (!gc || gc.tapped || !canAct(ref.player)) return false
    if (gc.sick && !parseKeywords(gc.card.effect).rage) return false
    return parseActivated(gc.card.effect).present
  }

  /** Incline la carte pour activer son effet ; applique l'auto (ressources / pioche). */
  function activateAbility(ref: CardRef) {
    const g = state.value
    if (!g) return
    const gc = getCardAt(ref)
    if (!gc) return
    const ab = parseActivated(gc.card.effect)
    if (!ab.present) return
    if (!canAct(ref.player)) {
      log(`⛔ ${g.players[ref.player].name} : ce n'est pas ton tour.`)
      return
    }
    if (gc.tapped) {
      log(`⛔ ${gc.card.name} est déjà incliné.`)
      return
    }
    if (gc.sick && !parseKeywords(gc.card.effect).rage) {
      log(`⛔ ${gc.card.name} est désorienté.`)
      return
    }

    gc.tapped = true
    const p = g.players[ref.player]
    if (ab.gainResources > 0) {
      p.resources += ab.gainResources
      log(`${p.name} active ${gc.card.name} : +${ab.gainResources} ressource(s) (${p.resources}).`)
    }
    if (ab.draw > 0) {
      log(`${p.name} active ${gc.card.name} : pioche ${ab.draw}.`)
      draw(ref.player, ab.draw)
    }
    if (ab.manual) {
      if (isSwapAbility(gc.card.effect)) {
        pendingSwap.value = ref
        log(`${p.name} active ${gc.card.name} — choisis l'allié avec qui échanger l'emplacement.`)
      } else {
        log(`${p.name} active ${gc.card.name} — effet à appliquer à la main : « ${gc.card.effect} »`)
      }
    }
    selected.value = null
  }

  // --- Combat guidé ---------------------------------------------------------

  function returnToHand(ref: CardRef) {
    const card = removeAt(ref)
    if (!card) return
    const objs = card.attached
    card.attached = []
    insertInto(ref.player, 'hand', card)
    // Récupération : les objets équipés accompagnent le personnage en main.
    for (const o of objs) insertInto(ref.player, 'hand', o)
  }

  function lineBonus(zone: CardRef['zone'], kw: Keywords): number {
    if (zone === 'front') return kw.avant
    if (zone === 'back') return kw.arriere
    return 0
  }

  /** Contribution des objets équipés à la puissance du porteur, selon son rôle. */
  function attachedPower(host: GameCard, zone: CardRef['zone'], role: 'attacker' | 'defender'): number {
    let sum = 0
    for (const obj of host.attached) {
      sum += parseEquipPower(obj.card.effect)
      const kw = parseKeywords(obj.card.effect)
      sum += role === 'attacker' ? kw.attaque : kw.defense
      sum += lineBonus(zone, kw)
    }
    return sum
  }

  function attachedContreAttaque(host: GameCard): boolean {
    return host.attached.some((o) => parseKeywords(o.card.effect).contreAttaque)
  }

  function supportPower(ref: CardRef | null): number {
    if (!ref) return 0
    const c = getCardAt(ref)
    if (!c) return 0
    // Un soutien apporte sa puissance, objets permanents inclus.
    const equip = c.attached.reduce((s, o) => s + parseEquipPower(o.card.effect), 0)
    return (c.card.power ?? 0) + c.tempPower + equip
  }

  /** Déclare une attaque avec le personnage pointé (il s'incline). */
  function declareAttack(ref: CardRef) {
    const g = state.value
    if (!g || combat.value) return
    const gc = getCardAt(ref)
    if (!gc) return
    const check = canAttack(g, ref.player, gc)
    if (!check.ok) {
      log(`⛔ ${g.players[ref.player].name} : ${check.reason}`)
      return
    }
    gc.tapped = true
    combat.value = { attacker: ref, column: null, defender: null, attackerSupport: null, defenderSupport: null }
    selected.value = null
    log(`${g.players[ref.player].name} déclare une attaque avec ${gc.card.name}.`)
  }

  /** Identifie le défenseur d'une colonne : avant → arrière → environnement. */
  function identifyDefender(defPlayer: PlayerId, column: number): CardRef {
    const front: CardRef = { player: defPlayer, zone: 'front', index: column }
    if (getCardAt(front)) return front
    const back: CardRef = { player: defPlayer, zone: 'back', index: column }
    if (getCardAt(back)) return back
    return { player: defPlayer, zone: 'environnement', index: 0 }
  }

  /** Choisit la colonne adverse ciblée et identifie le défenseur. */
  function chooseColumn(column: number) {
    const g = state.value
    const c = combat.value
    if (!g || !c) return
    const defPlayer = other(c.attacker.player)
    c.column = column
    c.defender = identifyDefender(defPlayer, column)
    const defCard = getCardAt(c.defender)
    log(`Colonne ${column + 1} ciblée — défenseur : ${defCard ? defCard.card.name : 'Environnement'}.`)
  }

  /** Un personnage peut-il être ajouté comme soutien à l'attaque en cours ? */
  function canSupport(ref: CardRef): boolean {
    const c = combat.value
    if (!c || c.column === null) return false
    const gc = getCardAt(ref)
    if (!gc || gc.card.type !== 'Personnage' || gc.tapped) return false
    if (sameRef(ref, c.attacker) || sameRef(ref, c.defender)) return false
    return true
  }

  /** Ajoute (ou remplace) le soutien du camp correspondant : le personnage s'incline. */
  function assignSupport(ref: CardRef) {
    const g = state.value
    const c = combat.value
    if (!g || !c || !canSupport(ref)) return
    const isAttackerSide = ref.player === c.attacker.player
    const current = isAttackerSide ? c.attackerSupport : c.defenderSupport
    if (current) {
      const prev = getCardAt(current)
      if (prev) prev.tapped = false
    }
    const gc = getCardAt(ref)!
    gc.tapped = true
    if (isAttackerSide) c.attackerSupport = ref
    else c.defenderSupport = ref
    selected.value = null
    log(`${g.players[ref.player].name} soutient avec ${gc.card.name} (+${(gc.card.power ?? 0) + gc.tempPower}).`)
  }

  function clearSupport(side: 'attacker' | 'defender') {
    const c = combat.value
    if (!c) return
    const ref = side === 'attacker' ? c.attackerSupport : c.defenderSupport
    if (ref) {
      const gc = getCardAt(ref)
      if (gc) gc.tapped = false
    }
    if (side === 'attacker') c.attackerSupport = null
    else c.defenderSupport = null
  }

  /** Calcule les puissances totales (base + bonus temporaires + mots-clés + soutien). */
  function combatTotals(): CombatTotals | null {
    const c = combat.value
    if (!c || c.column === null || !c.defender) return null
    const attCard = getCardAt(c.attacker)
    if (!attCard) return null
    const attKw = parseKeywords(attCard.card.effect)
    const attackerPower =
      (attCard.card.power ?? 0) +
      attCard.tempPower +
      attKw.attaque +
      lineBonus(c.attacker.zone, attKw) +
      attachedPower(attCard, c.attacker.zone, 'attacker') +
      supportPower(c.attackerSupport)

    const defenderIsEnv = c.defender.zone === 'environnement'
    const defCard = getCardAt(c.defender)
    let defenderPower = supportPower(c.defenderSupport)
    let defenderName = 'Environnement'
    let defenderContreAttaque = false
    if (!defenderIsEnv && defCard) {
      const defKw = parseKeywords(defCard.card.effect)
      defenderPower +=
        (defCard.card.power ?? 0) +
        defCard.tempPower +
        defKw.defense +
        lineBonus(c.defender.zone, defKw) +
        attachedPower(defCard, c.defender.zone, 'defender')
      defenderName = defCard.card.name
      defenderContreAttaque = defKw.contreAttaque || attachedContreAttaque(defCard)
    } else if (defCard) {
      defenderName = defCard.card.name
    }

    return {
      attackerName: attCard.card.name,
      attackerFaction: attCard.card.faction,
      attackerPower,
      defenderName,
      defenderFaction: defenderIsEnv ? null : (defCard?.card.faction ?? null),
      defenderPower,
      defenderIsEnv,
      defenderContreAttaque,
      attackerWins: attackerPower > defenderPower,
    }
  }

  /** Pièges (face cachée) du défenseur qui buffent le défenseur, révélables maintenant. */
  function revealableDefenderTraps(): { ref: CardRef; name: string; gain: number }[] {
    const c = combat.value
    if (!c || c.column === null || !c.defender || c.defender.zone === 'environnement') return []
    const defPlayer = other(c.attacker.player)
    const defCard = getCardAt(c.defender)
    const g = state.value
    if (!g || !defCard) return []
    const out: { ref: CardRef; name: string; gain: number }[] = []
    g.players[defPlayer].traps.forEach((slot, i) => {
      if (!slot) return
      const buff = parseDefenderBuff(slot.card.effect)
      if (!buff) return
      const factionGain =
        buff.factionBonus && defCard.card.faction === buff.factionBonus.faction ? buff.factionBonus.amount : 0
      out.push({
        ref: { player: defPlayer, zone: 'traps', index: i },
        name: slot.card.name,
        gain: buff.amount + factionGain,
      })
    })
    return out
  }

  /** Révèle un piège et applique son bonus de puissance (+ faction) au défenseur. */
  function revealDefenderTrap(ref: CardRef) {
    const g = state.value
    const c = combat.value
    if (!g || !c || !c.defender || c.defender.zone === 'environnement') return
    const trap = getCardAt(ref)
    if (!trap) return
    const buff = parseDefenderBuff(trap.card.effect)
    if (!buff) return
    const defender = getCardAt(c.defender)
    if (!defender) return

    let gain = buff.amount
    defender.tempPower += buff.amount
    if (buff.factionBonus && defender.card.faction === buff.factionBonus.faction) {
      defender.tempPower += buff.factionBonus.amount
      gain += buff.factionBonus.amount
    }
    const removed = removeAt(ref)
    if (removed) sendToDiscard(ref.player, removed)
    log(`${g.players[ref.player].name} révèle ${trap.card.name} : ${defender.card.name} gagne +${gain} puissance.`)
  }

  /** Résout l'attaque en cours et applique les conséquences. */
  function resolveCombat() {
    const g = state.value
    const c = combat.value
    if (!g || !c || c.defender === null) return
    const totals = combatTotals()
    if (!totals) return

    const attackerOwner = c.attacker.player
    const defenderOwner = other(attackerOwner)
    const attCard = getCardAt(c.attacker)
    const defCard = getCardAt(c.defender)

    if (totals.attackerWins) {
      if (totals.defenderIsEnv) {
        log(`${totals.attackerName} attaque l'Environnement adverse — 1 PV.`)
        addVictoryPoints(attackerOwner, 1)
        returnToHand(c.attacker)
      } else if (defCard) {
        const pts = gradePoints(defCard.card)
        sendToDiscard(defenderOwner, removeAt(c.defender)!)
        log(`${totals.attackerName} détruit ${totals.defenderName} — ${pts} PV.`)
        addVictoryPoints(attackerOwner, pts)
        returnToHand(c.attacker)
      }
    } else if (totals.defenderContreAttaque && defCard && attCard) {
      // Contre-Attaque : l'attaquant est détruit, le défenseur marque les points.
      const pts = gradePoints(attCard.card)
      sendToDiscard(attackerOwner, removeAt(c.attacker)!)
      log(`Contre-Attaque de ${totals.defenderName} : ${totals.attackerName} détruit — ${pts} PV pour le défenseur.`)
      addVictoryPoints(defenderOwner, pts)
    } else {
      log(`L'attaque de ${totals.attackerName} échoue (${totals.attackerPower} ≤ ${totals.defenderPower}).`)
    }

    combat.value = null
    selected.value = null
  }

  /** Annule l'attaque en cours et redresse les personnages inclinés pour l'occasion. */
  function cancelAttack() {
    const c = combat.value
    if (!c) return
    for (const ref of [c.attacker, c.attackerSupport, c.defenderSupport]) {
      if (ref) {
        const gc = getCardAt(ref)
        if (gc) gc.tapped = false
      }
    }
    combat.value = null
    log('Attaque annulée.')
  }

  // --- Ressources & points de victoire --------------------------------------

  function adjustResources(playerId: PlayerId, delta: number) {
    const g = state.value
    if (!g) return
    const p = g.players[playerId]
    const before = p.resources
    p.resources = Math.max(0, p.resources + delta)
    if (p.resources !== before) log(`${p.name} : ressources ${delta > 0 ? '+' : ''}${delta} → ${p.resources}.`)
  }

  function addVictoryPoints(playerId: PlayerId, delta: number) {
    const g = state.value
    if (!g) return
    const p = g.players[playerId]
    p.victoryPoints = Math.max(0, p.victoryPoints + delta)
    if (delta !== 0) log(`${p.name} : ${p.victoryPoints} PV.`)
    if (!g.winner && p.victoryPoints >= g.config.victoryTarget) {
      g.winner = playerId
      log(`🏆 ${p.name} atteint ${g.config.victoryTarget} PV et remporte la partie !`)
    }
  }

  // --- Tours & phases -------------------------------------------------------

  function untapPersonnages(playerId: PlayerId) {
    const g = state.value
    if (!g) return
    const p = g.players[playerId]
    // Début de tour : les personnages se redressent et ne sont plus désorientés.
    for (const slot of [...p.front, ...p.back]) {
      if (slot) {
        slot.tapped = false
        slot.sick = false
      }
    }
    if (p.artefact) p.artefact.tapped = false
  }

  function clearTempPower(playerId: PlayerId) {
    const g = state.value
    if (!g) return
    const p = g.players[playerId]
    for (const slot of [...p.front, ...p.back]) if (slot) slot.tempPower = 0
  }

  /** Applique la phase demandée en jouant ses effets d'entrée automatiques. */
  function goToPhase(phase: Phase) {
    const g = state.value
    if (!g) return
    g.phase = phase
    const active = g.activePlayer
    if (phase === 'debut') {
      // Début de tour : tous les personnages du joueur actif se redressent.
      untapPersonnages(active)
      log(`— Tour ${g.turn} · ${g.players[active].name} · ${PHASE_LABELS.debut}`)
    } else if (phase === 'principale') {
      log(`${g.players[active].name} · ${PHASE_LABELS.principale}`)
    } else {
      // Fin de tour : les bonus s'estompent, puis pioche jusqu'à 5 cartes.
      clearTempPower(active)
      drawUpTo(active, HAND_LIMIT)
      log(`${g.players[active].name} · ${PHASE_LABELS.fin} — pioche jusqu'à ${HAND_LIMIT}.`)
    }
  }

  /** Fait passer la main au joueur suivant et démarre son tour. */
  function startNextTurn() {
    const g = state.value
    if (!g || g.winner) return
    if (combat.value) cancelAttack()
    pendingEffect.value = null
    pendingSwap.value = null
    g.activePlayer = other(g.activePlayer)
    g.turn += 1
    selected.value = null
    goToPhase('debut')
  }

  /** Avance d'une étape dans le cycle : Début → Principale → Fin → tour suivant. */
  function advancePhase() {
    const g = state.value
    if (!g || g.status !== 'playing' || g.winner) return
    if (g.phase === 'debut') {
      goToPhase('principale')
    } else if (g.phase === 'principale') {
      // La réserve de ressources se réinitialise à la fin de la phase principale.
      g.players[g.activePlayer].resources = 0
      goToPhase('fin')
    } else {
      startNextTurn()
    }
  }

  /** Le label de l'action d'avancement selon la phase courante. */
  const advanceLabel = computed(() => {
    const g = state.value
    if (!g || g.status !== 'playing') return ''
    if (g.phase === 'debut') return 'Phase principale'
    if (g.phase === 'principale') return 'Fin de tour'
    return `Tour de ${g.players[other(g.activePlayer)].name}`
  })

  // --- Getters --------------------------------------------------------------

  const isStarted = computed(() => state.value !== null)
  const active = computed(() => (state.value ? state.value.players[state.value.activePlayer] : null))

  return {
    state,
    selected,
    freeMode,
    canAct,
    isStarted,
    active,
    // lifecycle
    startGame,
    performToss,
    reset,
    // draw
    draw,
    drawUpTo,
    mulligan,
    // selection & movement
    select,
    toggleSelect,
    sameRef,
    getCardAt,
    moveSelectedTo,
    moveCard,
    attachSelectedTo,
    // guided play (legality + costs)
    playCard,
    canPlayHandCard,
    isPlayTarget,
    attackable,
    // targeted effects
    pendingEffect,
    isEffectTarget,
    chooseEffectTarget,
    cancelPendingEffect,
    // swap (:rotation:)
    pendingSwap,
    canSwapTarget,
    chooseSwapTarget,
    cancelSwap,
    // activated abilities
    hasActivatedAbility,
    activateAbility,
    // artefacts & tokens
    isRevealableArtefact,
    revealArtefact,
    createEcuyers,
    // guided combat
    combat,
    declareAttack,
    chooseColumn,
    assignSupport,
    canSupport,
    clearSupport,
    combatTotals,
    revealableDefenderTraps,
    revealDefenderTrap,
    resolveCombat,
    cancelAttack,
    // card actions
    toggleTap,
    toggleFaceDown,
    addTempPower,
    discardForResource,
    // resources / VP
    adjustResources,
    addVictoryPoints,
    // turn / phase
    advancePhase,
    advanceLabel,
    startNextTurn,
    goToPhase,
    untapPersonnages,
    // helpers
    gradePoints,
    log,
  }
}
