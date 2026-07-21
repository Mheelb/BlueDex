import { onUnmounted, ref, shallowRef } from 'vue'
import { BlueRisingMoteur } from '@/game-ai/blueRising'
import { carteInfo } from '@/lib/aiDecks'

/** Configuration des decks passée au moteur (IDs de cartes = numéros BR1). */
export interface DecksConfig {
  deck0: number[]
  env0: number
  art0: number
  deck1: number[]
  env1: number
  art1: number
}

export interface ConfigPartie {
  seed: number
  decks: DecksConfig
  /** Siège occupé par l'IA (0 ou 1). */
  joueurIA: 0 | 1
  /** Difficulté : 50 facile · 150 normal · 400 difficile. */
  sims?: number
}

/** Type de l'état exposé par le moteur (dérivé, car l'interface n'est pas exportée). */
export type EtatBR = ReturnType<BlueRisingMoteur['lireEtat']>
export type CoteBR = EtatBR['joueurs'][0]

const SLOT_LABELS = ['Avant A', 'Avant B', 'Avant C', 'Arrière A', 'Arrière B', 'Arrière C']
const COL_LABELS = ['A', 'B', 'C']

function nomCarte(id: number | undefined | null): string {
  if (id === undefined || id === null) return 'une carte'
  if (id < 0) return 'un Écuyer'
  return carteInfo(id)?.nom ?? `#${id}`
}

/** Décrit une action (avant application) en français, pour le journal. */
function describeAction(etat: EtatBR, action: number): string {
  // Le décideur : l'adversaire de l'actif pendant les fenêtres de réaction.
  const reaction = etat.phase === 'bloc' || etat.phase === 'piege' || etat.phase === 'soutienDef'
  const j = reaction ? ((1 - etat.actif) as 0 | 1) : etat.actif
  const cote = etat.joueurs[j]
  if (action === 0) {
    if (etat.phase === 'main') return 'termine son tour'
    if (etat.phase === 'mulligan') return 'termine son mulligan (repioche)'
    return 'passe (aucune réaction)'
  }
  if (action >= 1 && action <= 10) {
    const nom = nomCarte(cote.main[action - 1])
    if (etat.phase === 'defausseFin') return `défausse ${nom} (limite de main)`
    if (etat.phase === 'triomphe') return `défausse ${nom} (paiement)`
    return `joue ${nom}`
  }
  if (action >= 11 && action <= 20) {
    const nom = nomCarte(cote.main[action - 11])
    if (etat.phase === 'mulligan') return `met ${nom} de côté (mulligan)`
    return `défausse ${nom} pour 1 ressource`
  }
  if (action >= 21 && action <= 26) {
    const s = action - 21
    if (etat.phase === 'placement') return `place ${nomCarte(cote.aPlacer[0])} en ${SLOT_LABELS[s]}`
    return `cible l'emplacement ${SLOT_LABELS[s]}`
  }
  if (action >= 27 && action <= 32) return `attaque à distance la cible en ${SLOT_LABELS[action - 27]}`
  if (action >= 33 && action <= 35) return `vise la colonne ${COL_LABELS[action - 33]}`
  if (action >= 36 && action <= 41) {
    const s = action - 36
    const nom = nomCarte(cote.plateau[s]?.carte)
    if (etat.phase === 'soutienAtt' || etat.phase === 'soutienDef') return `soutient avec ${nom}`
    if (etat.phase === 'bloc') return `bloque avec ${nom}`
    return `active/incline ${nom}`
  }
  if (action === 42) return 'incline son Environnement (ressources)'
  if (action === 43) return 'révèle son Artefact'
  if (action >= 44 && action <= 49) return `déclare une attaque avec ${nomCarte(cote.plateau[action - 44]?.carte)}`
  if (action === 50) return 'active son piège'
  return `action ${action}`
}

/**
 * Relie le board Vue, le moteur (source de vérité) et l'IA (Web Worker).
 * L'UI ne fait que 2 choses : AFFICHER `etat`/`legales`, APPELER `jouerHumain`.
 * L'IA joue seule dès que c'est à elle (y compris ses fenêtres de réaction).
 */
export function useBlueRising(config: ConfigPartie) {
  const moteur = new BlueRisingMoteur(
    config.decks.deck0,
    config.decks.env0,
    config.decks.art0,
    config.decks.deck1,
    config.decks.env1,
    config.decks.art1,
  )
  moteur.reset(config.seed)

  // Copie plate des decks (config.decks est un proxy réactif → non clonable par postMessage).
  const decksPlain: DecksConfig = {
    deck0: [...config.decks.deck0],
    env0: config.decks.env0,
    art0: config.decks.art0,
    deck1: [...config.decks.deck1],
    env1: config.decks.env1,
    art1: config.decks.art1,
  }

  const historique: number[] = []
  const etat = shallowRef<EtatBR>(snapshot())
  const legales = shallowRef<number[]>([])
  const joueurADecider = ref<0 | 1>(moteur.joueurADecider())
  const enReflexion = ref(false)
  /** Journal lisible des actions (toi + IA), le plus récent en tête. */
  const journal = shallowRef<{ ia: boolean; texte: string }[]>([])
  /** Puissance effective (attaque) par joueur/emplacement — buffs, split, auras inclus. */
  const puissances = shallowRef<Record<number, Record<number, number>>>({ 0: {}, 1: {} })

  const worker = new Worker(new URL('../game-ai/iaWorker.js', import.meta.url), { type: 'module' })
  worker.onmessage = (ev: MessageEvent<{ action: number; pourCoup: number }>) => {
    // On ignore les réponses périmées (resync / nouvelle partie).
    if (ev.data.pourCoup !== historique.length) return
    enReflexion.value = false
    appliquer(ev.data.action)
  }
  onUnmounted(() => worker.terminate())

  function snapshot(): EtatBR {
    // L'état est sérialisable (contrat) : un clone JSON garantit la réactivité.
    return JSON.parse(JSON.stringify(moteur.lireEtat())) as EtatBR
  }

  function refresh() {
    etat.value = snapshot()
    joueurADecider.value = moteur.joueurADecider()
    const finie = etat.value.finie
    legales.value = !finie && moteur.joueurADecider() !== config.joueurIA ? moteur.actionsLegales() : []
    // Puissances effectives (le moteur calcule buffs / split / auras).
    const live = moteur.lireEtat()
    const p: Record<number, Record<number, number>> = { 0: {}, 1: {} }
    for (const jj of [0, 1] as const) {
      for (let s = 0; s < 6; s++) if (live.joueurs[jj].plateau[s]) p[jj][s] = moteur.pubAttaque(jj, s)
    }
    puissances.value = p
  }

  function appliquer(action: number) {
    // Décrire l'action AVANT de l'appliquer (l'état va changer).
    const avant = moteur.lireEtat()
    const parIA = moteur.joueurADecider() === config.joueurIA
    const texte = describeAction(avant, action)
    moteur.jouer(action)
    historique.push(action)
    journal.value = [{ ia: parIA, texte }, ...journal.value].slice(0, 250)
    refresh()
    demanderIA()
  }

  function demanderIA() {
    if (moteur.lireEtat().finie) return
    if (moteur.joueurADecider() !== config.joueurIA) return
    enReflexion.value = true
    worker.postMessage({
      seed: config.seed,
      historique: [...historique],
      sims: config.sims ?? 150,
      decks: decksPlain,
    })
  }

  /** À appeler quand le joueur humain clique une action légale. */
  function jouerHumain(action: number) {
    if (moteur.lireEtat().finie) return
    if (moteur.joueurADecider() === config.joueurIA) return
    if (!moteur.actionsLegales().includes(action)) return
    appliquer(action)
  }

  // Amorçage : si l'IA commence, elle joue tout de suite.
  refresh()
  demanderIA()

  return {
    etat,
    legales,
    joueurADecider,
    enReflexion,
    historique,
    journal,
    puissances,
    jouerHumain,
    joueurIA: config.joueurIA,
  }
}
