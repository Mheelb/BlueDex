/**
 * mcts.ts — Agent MCTS générique, v0.2.
 *
 * Nouveautés :
 *  - `filtre`  : élague les actions "bruit" AVANT l'arbre (annulations,
 *    défausses inutiles...) — arbre plus profond à simulations égales.
 *  - `rollout` : politique de fin de partie injectable (heuristique métier)
 *    à la place du pur hasard.
 *  - `determinisation` : si le moteur expose determiniser(), chaque simulation
 *    re-mélange l'info cachée -> le MCTS ne "voit" plus les mains adverses.
 *    La sélection devient robuste aux actions qui changent de légalité d'une
 *    determinization à l'autre (variante standard "determinized UCT").
 */
import { Moteur } from "./moteur.js";
export interface OptionsMCTS {
    filtre?: (m: Moteur) => number[];
    rollout?: (m: Moteur, rng: () => number) => number;
    determinisation?: boolean;
    capRollout?: number;
}
export declare class AgentMCTS {
    private nbSimulations;
    private cUcb;
    private rng;
    private opts;
    constructor(nbSimulations?: number, cUcb?: number, rng?: () => number, opts?: OptionsMCTS);
    private legales;
    choisir(moteur: Moteur): number;
}
/** Adversaire de référence : joue au hasard (l'étalon zéro de toute mesure). */
export declare class AgentAleatoire {
    private rng;
    constructor(rng?: () => number);
    choisir(moteur: Moteur): number;
}
