/**
 * iaWorker.js — L'IA MCTS dans un Web Worker (hors du thread UI).
 *
 * Protocole stateless : l'UI envoie { seed, historique, sims, decks },
 * le worker rejoue la partie depuis le seed puis renvoie { action, pourCoup }.
 * Aucune désynchro possible : la seule vérité est (seed + historique) côté UI.
 *
 * Fichier .js volontairement (hors du type-check strict de vue-tsc) ; le moteur
 * importé est le build compilé du projet MCTS.
 */
import { BlueRisingMoteur } from './blueRising.js'
import { creerAgentBR } from './heuristique.js'
import { creerRng } from './moteur.js'

self.onmessage = (ev) => {
  const { seed, historique, sims, decks } = ev.data
  const m = new BlueRisingMoteur(decks.deck0, decks.env0, decks.art0, decks.deck1, decks.env1, decks.art1)
  m.reset(seed)
  for (const a of historique) m.jouer(a)
  // RNG de l'agent dérivé du contexte : reproductible mais différent à chaque coup.
  const agent = creerAgentBR(sims ?? 150, creerRng((seed * 7919 + historique.length) >>> 0))
  const action = agent.choisir(m)
  self.postMessage({ action, pourCoup: historique.length })
}
