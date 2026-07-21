/**
 * heuristique.ts — Le "bon sens Blue Rising" injecté dans le MCTS.
 *
 * Deux briques :
 *  - filtreBR   : retire les actions objectivement mauvaises ou "bruit"
 *    (annuler une attaque déclarée, défausser sans projet, attaquer quand
 *    aucune cible n'est battable même avec son meilleur soutien).
 *  - rolloutBR  : politique de simulation — au lieu de jouer au hasard,
 *    les fins de parties imaginaires suivent des priorités de joueur :
 *    soutenir SEULEMENT si ça change l'issue, bloquer avec le moins précieux,
 *    préférer poser des personnages, viser les colonnes gagnables.
 *
 * creerAgentBR(sims, rng) assemble le tout (+ determinization).
 */
import { Moteur } from "./moteur.js";
import { AgentMCTS } from "./mcts.js";
export declare function filtreBR(mot: Moteur): number[];
export declare function rolloutBR(mot: Moteur, rng: () => number): number;
/** L'agent Blue Rising complet : MCTS + filtre + rollout guidé + info cachée. */
export declare function creerAgentBR(sims: number, rng: () => number, determinisation?: boolean): AgentMCTS;
