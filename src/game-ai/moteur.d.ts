/**
 * moteur.ts — LE CONTRAT que ton moteur Blue Rising doit implémenter.
 *
 * C'est INTERFACE_MOTEUR.md traduit en TypeScript. Ton moteur exporte une
 * classe qui implémente `Moteur`, et TOUTE la partie IA (MCTS aujourd'hui,
 * RL demain) fonctionne dessus sans rien connaître de Blue Rising.
 *
 * Les 3 règles d'or (rappel) :
 *   1. Zéro dépendance UI (pas de React, pas de DOM, pas de fetch).
 *   2. Tout le hasard passe par le RNG seedé fourni — jamais Math.random().
 *   3. L'état est sérialisable en JSON (sauvegarde/rechargement exact).
 */
export type Joueur = 0 | 1;
export interface Moteur {
    /** Nouvelle partie. Même seed => même partie, toujours. */
    reset(seed: number): void;
    /** Qui doit choisir MAINTENANT (fenêtres de réaction comprises). */
    joueurADecider(): Joueur;
    /** Actions légales à cet instant — indices dans l'espace d'actions FIXE. */
    actionsLegales(): number[];
    /** Applique l'action (erreur si illégale). Récompense du point de vue J0 :
     *  +1 = J0 gagne, -1 = J1 gagne, 0 = partie en cours ou nulle. */
    jouer(action: number): {
        recompense: number;
        terminee: boolean;
    };
    /** L'état vu par `joueur` (info cachée respectée), en nombres, taille fixe.
     *  Inutile pour le MCTS "triche" (voir mcts.ts), vital pour le RL. */
    observation(joueur: Joueur): number[];
    /** Copie profonde et indépendante — le MCTS en fait des milliers. */
    cloner(): Moteur;
    /** Taille de l'espace d'actions (constante pour un jeu donné). */
    nbActions(): number;
    /** OPTIONNEL (jeux à information cachée) : re-mélange tout ce que `joueur`
     *  ne peut pas connaître (main adverse, ordre des decks) pour que les
     *  simulations du MCTS ne trichent pas. */
    determiniser?(joueur: Joueur): void;
}
/**
 * RNG déterministe (mulberry32) : LE remplaçant de Math.random().
 * Ton moteur le reçoit dans reset(seed) et l'utilise pour TOUT
 * (mélange des decks, pioches...).
 */
export declare function creerRng(seed: number): () => number;
