/**
 * cartes.ts — La table des cartes connues du moteur.
 *
 * v0.2 : import complet des 120 premières cartes Blue Rising (set BR1, n° 1→120),
 * depuis l'export bluedex (cards_rows). Les stats (cout/puissance/soutien),
 * types, factions et sous-types viennent directement de la base.
 *
 * - `effet` = identifiant d'effet ; sa logique vit dans blueRising.ts. Seules les
 *   cartes déjà implémentées par le moteur ont un identifiant ; les autres sont à
 *   `null` (le moteur les traite comme sans effet tant qu'on ne les code pas).
 * - `texte` = texte de jeu brut (référence, non utilisé par le moteur ; accents
 *   simplifiés à l'import).
 * - `motsCles` = mots-clés détectés dans le texte ("rage", "resistant",
 *   "distance", "contreattaque", "furtif").
 */
export type TypeCarte = "personnage" | "evenement" | "piege" | "environnement" | "artefact" | "objet";
export type SousType = "aspirant" | "heros" | "legende" | null;
export type Faction = "veilleur" | "gardien" | "emissaire" | null;
export interface Carte {
    id: number;
    nom: string;
    type: TypeCarte;
    sousType: SousType;
    faction: Faction;
    cout: number;
    puissance: number;
    soutien: number;
    effet: string | null;
    motsCles: string[];
    texte: string | null;
}
export declare const CARTES: Record<number, Carte>;
export declare const JETON_ECUYER = -1;
/** Les deux decks de test (42 cartes chacun, listes v2 validées). */
export declare const DECK_ECUYER: number[];
export declare const ENV_ECUYER = 72, ART_ECUYER = 80;
export declare const DECK_GARDIEN: number[];
export declare const ENV_GARDIEN = 73, ART_GARDIEN = 78;
