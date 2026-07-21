/**
 * blueRising.ts — MOTEUR Blue Rising v0.1 (implémente le contrat `Moteur`).
 *
 * Couvre : structure de tour, ressources (génériques + restreintes faction),
 * pose/remplacement, unicité, désorientation, attaques (colonne, distance,
 * blocage de colonne vide), pièges, soutiens (1 par camp, adjacence),
 * égalité = défenseur, récupération, jetons Écuyer, Légendes verrouillées,
 * deck-out, artefacts, auras, buffs temporaires, victoire à 5 PV —
 * et les effets des ~30 cartes des deux decks de test (cartes.ts).
 *
 * Simplifications v0.1 assumées (voir README) : mulligan absent, Aspirants
 * du setup choisis automatiquement, paiements de pièges/Triomphe défaussés
 * automatiquement (dernières cartes de la main), pose de piège en réaction
 * absente, "Résistant" sans effet (notre jurisprudence : pas de taxe sur le
 * combat), positions des jetons créés automatiques.
 */
import { Moteur, Joueur } from "./moteur.js";
export declare const PASS = 0;
export declare const HAND: (i: number) => number;
export declare const DISC: (i: number) => number;
export declare const SLOT: (s: number) => number;
export declare const ESLOT: (s: number) => number;
export declare const COL: (c: number) => number;
export declare const INCL: (s: number) => number;
export declare const TAP_ENV = 42;
export declare const ARTEFACT = 43;
export declare const ATT: (s: number) => number;
export declare const TRAP = 50;
export declare const NB_ACTIONS = 51;
type Phase = "placement" | "mulligan" | "main" | "slot" | "colonne" | "cible" | "bloc" | "piege" | "soutienAtt" | "soutienDef" | "triomphe" | "defausseFin" | "over";
interface Perso {
    carte: number;
    jeton: boolean;
    incline: boolean;
    poseTour: number;
    objet: number | null;
}
interface Buff {
    slot: number;
    att: number;
    def: number;
}
interface Cote {
    deck: number[];
    main: number[];
    defausse: number[];
    plateau: (Perso | null)[];
    pieges: (number | null)[];
    env: number;
    envIncline: boolean;
    artefact: number;
    artefactUtilise: boolean;
    pv: number;
    pvCeTour: number;
    resGen: number;
    resFac: number;
    buffs: Buff[];
    aPlacer: number[];
    mulliganAside: number[];
}
interface Pending {
    kind: "perso" | "objet" | "piege" | "ev_campagne" | "ev_archives" | "ev_adversaires" | "ev_cri" | "attaque_cible";
    handIdx?: number;
    carte?: number;
    criSource?: number;
    criPuissance?: number;
}
interface Attaque {
    slotAtt: number;
    distance: boolean;
    colonne: number;
    slotDef: number | null;
    bonusAtt: number;
    bonusDef: number;
}
interface Etat {
    rngState: number;
    joueurs: [Cote, Cote];
    tour: number;
    actif: Joueur;
    phase: Phase;
    pending: Pending | null;
    attaque: Attaque | null;
    finie: boolean;
    recompense: number;
}
export declare class BlueRisingMoteur implements Moteur {
    private etat;
    private cacheLegales;
    private decks;
    private envs;
    private arts;
    constructor(deck0: number[], env0: number, art0: number, deck1: number[], env1: number, art1: number);
    reset(seed: number): void;
    /** Effets « en arrivant en jeu » des Aspirants placés par `j` (révélation setup). */
    private etbAspirants;
    joueurADecider(): Joueur;
    nbActions(): number;
    actionsLegales(): number[];
    jouer(action: number): {
        recompense: number;
        terminee: boolean;
    };
    observation(joueur: Joueur): number[];
    cloner(): BlueRisingMoteur;
    lireEtat(): Etat;
    /** Re-mélange l'information cachée du point de vue de `joueur` :
     *  son propre deck (ordre inconnu) + main et deck adverses (contenus
     *  inconnus, effectifs connus). Les pièges posés restent connus (v0.2,
     *  simplification notée dans le README). */
    determiniser(joueur: Joueur): void;
    /** Helpers publics pour heuristiques/affichage (mêmes calculs que le combat). */
    pubAttaque(j: Joueur, slot: number): number;
    pubDefense(j: Joueur, slot: number): number;
    /** Bilan du combat en cours (bonus inclus), ou null hors combat. */
    bilanCombat(): {
        pAtt: number;
        pDef: number;
        slotDef: number | null;
    } | null;
    /** Copie manuelle : ~15x plus rapide que structuredClone (forme connue). */
    private static copierCote;
    private static copierEtat;
    private jouerMain;
    private lancerAttaque;
    private avancerApresPiege;
    /** Recalcul forcé : les helpers internes ne doivent JAMAIS lire le cache. */
    private legalesFraiches;
    private avancerSoutienAtt;
    private avancerSoutienDef;
    private activerPiege;
    private resoudreCombat;
    private puissanceBase;
    private buffsPour;
    private puissanceAttaque;
    private puissanceDefense;
    private poserPerso;
    private resoudreCampagne;
    private splitOublie;
    private rugissement;
    private activerArtefact;
    private conditionArtefact;
    private creerJetons;
    private piocher;
    private finirTour;
    private marquer;
    private verifierVictoire;
    private affordablePerso;
    private payerPerso;
    private payerEv;
    private payerAuto;
    private uniciteViolee;
    private legendeOK;
    private evJouable;
    private desoriente;
    private adjacents;
    private buff;
    /** Modificateur passif de l'Objet équipé sur `p` (0 si aucun / non répertorié). */
    private objetStat;
    /** Mots-clés conférés par l'Objet équipé (ex. "distance", "resistant"). */
    private objetMots;
    /** Soutien effectif d'un perso (base + Objet ; un jeton ne soutient pas). */
    private soutienDe;
    /** Coût pour équiper `objetId` sur la case `slot` (Jiraya / Kameto -> 0). */
    private coutObjet;
    /** Existe-t-il une cible sur laquelle l'Objet est jouable et payable ? */
    private objetJouable;
    /** Paie et équipe l'Objet `handIdx` de la main sur `slot` (remplace l'ancien). */
    private equiperObjet;
    /** Quand un perso quitte le jeu : son Objet éventuel part en défausse. */
    private defausserEquipement;
    /** Un pas de mulberry32 sur l'état : déterministe, clonable, sérialisable. */
    private rand;
    private melanger;
}
export {};
