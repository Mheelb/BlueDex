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
/**
 * RNG déterministe (mulberry32) : LE remplaçant de Math.random().
 * Ton moteur le reçoit dans reset(seed) et l'utilise pour TOUT
 * (mélange des decks, pioches...).
 */
export function creerRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
