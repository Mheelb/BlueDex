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
import { CARTES, JETON_ECUYER } from "./cartes.js";
// ---------- Espace d'actions (FIXE : 51 actions) ----------
export const PASS = 0;
export const HAND = (i) => 1 + i; // 1..10  : carte n°i de ma main
export const DISC = (i) => 11 + i; // 11..20 : défausser n°i (+1 ressource)
export const SLOT = (s) => 21 + s; // 21..26 : mon emplacement s
export const ESLOT = (s) => 27 + s; // 27..32 : emplacement ennemi s
export const COL = (c) => 33 + c; // 33..35 : colonne A/B/C
export const INCL = (s) => 36 + s; // 36..41 : incliner mon perso s
export const TAP_ENV = 42;
export const ARTEFACT = 43;
export const ATT = (s) => 44 + s; // 44..49 : attaquer avec mon perso s
export const TRAP = 50; // activer le piège de la colonne
export const NB_ACTIONS = 51;
/**
 * Bonus PASSIFS conférés par un Objet équipé (id bluedex -> modificateurs
 * permanents tant que l'Objet reste en jeu). Seuls les Objets à effet
 * "statique" (bonus de stat / mot-clé) sont ici ; les Objets à capacité
 * activée ou déclenchée (détruire l'objet pour X, :rotation: gagnez des
 * ressources, etc.) restent équipables mais sans effet mécanique tant qu'on
 * ne les code pas. Étendre au besoin (les réimpressions >120 partagent les
 * mêmes noms). */
const OBJET_BONUS = {
    16: { def: 2 }, // Les trompettes de la victoire : Défense +2
    19: { att: 1, def: 1 }, // Chiens de combats : Puissance +1
    53: { att: 2 }, // Épée du matin : Attaque +2
    100: { soutien: 2 }, // Le chapeau d'Atow : Soutien +2
    101: { mots: ["distance"] }, // Fusil à Lunette : Attaque à distance
    17: { mots: ["resistant"] }, // Couronne du prince : Résistant (sans effet moteur)
};
export class BlueRisingMoteur {
    etat;
    cacheLegales = null; // invalidé à chaque jouer()
    decks;
    envs;
    arts;
    constructor(deck0, env0, art0, deck1, env1, art1) {
        this.decks = [deck0.slice(), deck1.slice()];
        this.envs = [env0, env1];
        this.arts = [art0, art1];
    }
    // =============== Contrat Moteur ===============
    reset(seed) {
        this.cacheLegales = null;
        // Amorce de l'état AVANT tout tirage : le RNG est une donnée comme une autre.
        this.etat = { rngState: seed >>> 0 };
        const cote = (idx) => ({
            deck: this.melanger(this.decks[idx].slice()),
            main: [], defausse: [],
            plateau: [null, null, null, null, null, null],
            pieges: [null, null, null],
            env: this.envs[idx], envIncline: false,
            artefact: this.arts[idx], artefactUtilise: false,
            pv: 0, pvCeTour: 0, resGen: 0, resFac: 0, buffs: [],
            aPlacer: [], mulliganAside: [],
        });
        const rngState = this.etat.rngState;
        this.etat = {
            rngState, joueurs: [cote(0), cote(1)], tour: 0, actif: 0, phase: "placement",
            pending: null, attaque: null, finie: false, recompense: 0,
        };
        // Aspirants de départ : 4 noms distincts extraits du deck, à PLACER par le joueur.
        for (const j of [0, 1]) {
            const cj = this.etat.joueurs[j];
            const pris = new Set();
            for (let i = 0; i < cj.deck.length && pris.size < 4;) {
                const id = cj.deck[i];
                if (CARTES[id].sousType === "aspirant" && !pris.has(id)) {
                    cj.deck.splice(i, 1);
                    cj.aPlacer.push(id);
                    pris.add(id);
                }
                else
                    i++;
            }
        }
        // Mains de départ : le 1er joueur pioche 3, le second 5. Les effets d'arrivée
        // (Kitty) et le début de partie sont déclenchés à la fin du setup (placement + mulligan).
        for (let k = 0; k < 3; k++)
            this.piocher(0);
        for (let k = 0; k < 5; k++)
            this.piocher(1);
    }
    /** Effets « en arrivant en jeu » des Aspirants placés par `j` (révélation setup). */
    etbAspirants(j) {
        for (const p of this.etat.joueurs[j].plateau)
            if (p && CARTES[p.carte].effet === "etb_pioche1")
                this.piocher(j);
    }
    joueurADecider() {
        const e = this.etat;
        if (["bloc", "piege", "soutienDef"].includes(e.phase))
            return (1 - e.actif);
        return e.actif;
    }
    nbActions() { return NB_ACTIONS; }
    actionsLegales() {
        if (this.cacheLegales)
            return this.cacheLegales;
        const e = this.etat;
        if (e.finie)
            return [];
        const a = [];
        const j = this.joueurADecider();
        const cj = e.joueurs[j];
        const adv = e.joueurs[1 - j];
        switch (e.phase) {
            case "placement": {
                // Setup : poser le prochain Aspirant sur un emplacement libre.
                for (let s = 0; s < 6; s++)
                    if (!cj.plateau[s])
                        a.push(SLOT(s));
                break;
            }
            case "mulligan": {
                // Setup : mettre de côté des cartes (DISC) puis terminer (PASS) pour repiocher autant.
                a.push(PASS);
                for (let i = 0; i < Math.min(cj.main.length, 10); i++)
                    a.push(DISC(i));
                break;
            }
            case "main": {
                a.push(PASS); // fin de tour
                for (let i = 0; i < Math.min(cj.main.length, 10); i++) {
                    a.push(DISC(i));
                    const c = CARTES[cj.main[i]];
                    if (c.type === "personnage" && this.affordablePerso(cj, c) &&
                        !this.uniciteViolee(cj, c.id) && this.legendeOK(j, c))
                        a.push(HAND(i));
                    if (c.type === "piege")
                        a.push(HAND(i));
                    if (c.type === "objet" && this.objetJouable(cj, c.id))
                        a.push(HAND(i));
                    if (c.type === "evenement" && c.effet !== "ev_triomphe" &&
                        cj.resGen >= c.cout && this.evJouable(cj, c))
                        a.push(HAND(i));
                }
                for (let s = 0; s < 6; s++) {
                    const p = cj.plateau[s];
                    if (!p || p.incline || this.desoriente(j, p))
                        continue;
                    const eff = p.jeton ? null : CARTES[p.carte].effet;
                    if (eff === "tap_ressource1" || eff === "tap_pioche1")
                        a.push(INCL(s));
                    a.push(ATT(s));
                }
                if (!cj.envIncline)
                    a.push(TAP_ENV);
                if (!cj.artefactUtilise && this.conditionArtefact(j))
                    a.push(ARTEFACT);
                break;
            }
            case "slot": {
                a.push(PASS); // annuler
                const k = e.pending.kind;
                for (let s = 0; s < 6; s++) {
                    const p = cj.plateau[s];
                    if (k === "perso")
                        a.push(SLOT(s)); // libre ou remplacement
                    else if (p && k === "objet" && cj.resGen >= this.coutObjet(cj, s, e.pending.carte))
                        a.push(SLOT(s));
                    else if (p && k === "ev_campagne")
                        a.push(SLOT(s));
                    else if (p && !p.jeton && (k === "ev_archives" || k === "ev_adversaires"))
                        a.push(SLOT(s));
                    else if (p && k === "ev_cri" && s !== e.pending.criSource)
                        a.push(SLOT(s));
                }
                break;
            }
            case "colonne":
                a.push(PASS);
                for (let c = 0; c < 3; c++)
                    a.push(COL(c));
                break;
            case "cible": {
                a.push(PASS);
                if (e.pending.kind === "attaque_cible")
                    for (let s = 0; s < 6; s++)
                        if (adv.plateau[s])
                            a.push(ESLOT(s));
                if (e.pending.kind === "ev_cri")
                    for (let s = 0; s < 6; s++) {
                        const p = cj.plateau[s];
                        if (p && !p.incline && !this.desoriente(j, p))
                            a.push(INCL(s));
                    }
                break;
            }
            case "bloc": {
                a.push(PASS); // laisser passer (défenseur = Environnement)
                for (let s = 0; s < 6; s++) {
                    const p = cj.plateau[s];
                    if (p && !p.incline)
                        a.push(INCL(s));
                }
                break;
            }
            case "piege": {
                a.push(PASS);
                const piege = cj.pieges[e.attaque.colonne];
                if (piege !== null && cj.main.length >= CARTES[piege].cout)
                    a.push(TRAP);
                break;
            }
            case "soutienAtt": {
                a.push(PASS);
                const att = e.attaque;
                for (let s = 0; s < 6; s++) {
                    const p = cj.plateau[s];
                    if (p && !p.incline && !this.desoriente(j, p) && s !== att.slotAtt &&
                        this.adjacents(s, att.slotAtt))
                        a.push(INCL(s));
                }
                break;
            }
            case "soutienDef": {
                a.push(PASS);
                const att = e.attaque;
                if (att.slotDef === null)
                    break;
                for (let s = 0; s < 6; s++) {
                    const p = cj.plateau[s];
                    if (p && !p.incline && (s === att.slotDef || this.adjacents(s, att.slotDef)))
                        a.push(INCL(s)); // auto-soutien du défenseur autorisé
                }
                break;
            }
            case "triomphe": {
                a.push(PASS);
                const idx = cj.main.findIndex((id) => CARTES[id].effet === "ev_triomphe");
                if (idx >= 0) {
                    const attaquant = cj.plateau[e.attaque.slotAtt];
                    const cout = CARTES[attaquant.carte].faction === "gardien" ? 1 : 2;
                    const payable = cj.resGen + (cj.main.length - 1); // ressources + défausses
                    if (payable >= cout)
                        a.push(HAND(idx));
                }
                break;
            }
            case "defausseFin":
                for (let i = 0; i < Math.min(cj.main.length, 10); i++)
                    a.push(HAND(i));
                break;
        }
        this.cacheLegales = a;
        return a;
    }
    jouer(action) {
        if (!this.actionsLegales().includes(action))
            throw new Error(`Action illégale ${action} en phase ${this.etat.phase}`);
        const e = this.etat;
        const j = this.joueurADecider();
        const cj = e.joueurs[j];
        switch (e.phase) {
            case "placement": {
                const s = action - SLOT(0);
                const id = cj.aPlacer.shift();
                cj.plateau[s] = { carte: id, jeton: false, incline: false, poseTour: -1, objet: null };
                if (cj.aPlacer.length === 0) {
                    this.etbAspirants(j); // révélation : effets « en arrivant en jeu »
                    if (j === 0)
                        e.actif = 1; // au joueur 1 de placer
                    else {
                        e.actif = 0;
                        e.phase = "mulligan";
                    } // les deux ont placé → mulligan
                }
                break;
            }
            case "mulligan": {
                if (action === PASS) {
                    const n = cj.mulliganAside.length;
                    cj.deck = this.melanger(cj.deck.concat(cj.mulliganAside));
                    cj.mulliganAside = [];
                    for (let k = 0; k < n; k++)
                        this.piocher(j);
                    if (j === 0)
                        e.actif = 1; // au joueur 1 de mulligan
                    else {
                        e.actif = 0;
                        e.phase = "main";
                    } // setup terminé : la partie commence
                }
                else {
                    cj.mulliganAside.push(cj.main.splice(action - DISC(0), 1)[0]);
                }
                break;
            }
            case "main":
                this.jouerMain(j, action);
                break;
            case "slot": {
                if (action === PASS) {
                    e.pending = null;
                    e.phase = "main";
                    break;
                }
                const s = action - SLOT(0);
                const pd = e.pending;
                if (pd.kind === "perso")
                    this.poserPerso(j, pd.handIdx, s);
                else if (pd.kind === "objet")
                    this.equiperObjet(j, pd.handIdx, s);
                else if (pd.kind === "ev_campagne")
                    this.resoudreCampagne(j, s, pd.handIdx);
                else if (pd.kind === "ev_archives") {
                    this.payerEv(j, pd.handIdx);
                    this.buff(cj, s, 1, 0); /* + distance : géré via buff spécial */
                    cj.plateau[s].jeton;
                    cj.plateau[s].distanceTour = e.tour;
                }
                else if (pd.kind === "ev_adversaires") {
                    this.payerEv(j, pd.handIdx);
                    this.buff(cj, s, 2, 0);
                }
                else if (pd.kind === "ev_cri") {
                    this.payerEv(j, pd.handIdx);
                    this.buff(cj, s, pd.criPuissance, 0);
                }
                e.pending = null;
                e.phase = "main";
                break;
            }
            case "colonne": {
                if (action === PASS) {
                    e.pending = null;
                    e.phase = "main";
                    break;
                }
                const c = action - COL(0);
                const pd = e.pending;
                if (pd.kind === "piege") {
                    const id = cj.main.splice(pd.handIdx, 1)[0];
                    if (cj.pieges[c] !== null)
                        cj.defausse.push(cj.pieges[c]);
                    cj.pieges[c] = id;
                    e.pending = null;
                    e.phase = "main";
                }
                else { // attaque de colonne
                    e.pending = null;
                    this.lancerAttaque(j, pd.handIdx, false, c, null);
                }
                break;
            }
            case "cible": {
                const pd = e.pending;
                if (action === PASS) {
                    e.pending = null;
                    e.phase = "main";
                    break;
                }
                if (pd.kind === "attaque_cible") {
                    const s = action - ESLOT(0);
                    e.pending = null;
                    this.lancerAttaque(j, pd.handIdx, true, s % 3, s);
                }
                else { // ev_cri étape 1 : la source s'incline
                    const s = action - INCL(0);
                    const p = cj.plateau[s];
                    p.incline = true;
                    pd.criSource = s;
                    pd.criPuissance = this.puissanceBase(j, s);
                    e.phase = "slot";
                }
                break;
            }
            case "bloc": {
                if (action === PASS) {
                    e.attaque.slotDef = null;
                    e.phase = "piege";
                    this.avancerApresPiege();
                    break;
                }
                const s = action - INCL(0);
                const p = cj.plateau[s];
                p.incline = true;
                const dest = e.attaque.colonne; // le bloqueur vient en Avant de la colonne
                cj.plateau[s] = null;
                cj.plateau[dest] = p;
                e.attaque.slotDef = dest;
                e.phase = "piege";
                this.avancerApresPiege();
                break;
            }
            case "piege": {
                if (action === TRAP)
                    this.activerPiege(j);
                else {
                    e.phase = "soutienAtt";
                    this.avancerSoutienAtt();
                }
                break;
            }
            case "soutienAtt": {
                if (action !== PASS) {
                    const s = action - INCL(0);
                    cj.plateau[s].incline = true;
                    e.attaque.bonusAtt += this.soutienDe(j, s);
                }
                e.phase = "soutienDef";
                this.avancerSoutienDef();
                break;
            }
            case "soutienDef": {
                if (action !== PASS) {
                    const s = action - INCL(0);
                    const p = cj.plateau[s];
                    p.incline = true;
                    e.attaque.bonusDef += this.soutienDe(j, s);
                }
                this.resoudreCombat();
                break;
            }
            case "triomphe": {
                const att = e.attaque;
                const attaquantPerso = cj.plateau[att.slotAtt];
                if (action === PASS) {
                    // Récupération normale : retour en main (l'Objet équipé est défaussé).
                    this.defausserEquipement(cj, attaquantPerso);
                    cj.main.push(attaquantPerso.carte);
                    cj.plateau[att.slotAtt] = null;
                }
                else {
                    const idx = action - HAND(0);
                    const cout = CARTES[attaquantPerso.carte].faction === "gardien" ? 1 : 2;
                    cj.defausse.push(cj.main.splice(idx, 1)[0]); // le Triomphe part en défausse
                    this.payerAuto(cj, cout); // + son coût
                    // L'attaquant reste en jeu (incliné).
                }
                e.attaque = null;
                e.phase = "main";
                break;
            }
            case "defausseFin": {
                const idx = action - HAND(0);
                cj.defausse.push(cj.main.splice(idx, 1)[0]);
                if (cj.main.length <= 5)
                    this.finirTour();
                break;
            }
        }
        if (!e.finie)
            this.verifierVictoire();
        this.cacheLegales = null; // invalidation APRÈS toutes les mutations du coup
        return { recompense: e.recompense, terminee: e.finie };
    }
    observation(joueur) {
        const e = this.etat, moi = e.joueurs[joueur], lui = e.joueurs[1 - joueur];
        const obs = [e.tour, e.actif === joueur ? 1 : 0,
            moi.pv, lui.pv, moi.resGen, moi.resFac,
            moi.deck.length, lui.deck.length, lui.main.length];
        const pushPerso = (p) => obs.push(p ? (p.jeton ? 999 : p.carte) : 0, p?.incline ? 1 : 0, p && p.poseTour === e.tour ? 1 : 0, p?.objet ?? 0); // id de l'Objet équipé (0 = aucun)
        for (const p of moi.plateau)
            pushPerso(p);
        for (const p of lui.plateau)
            pushPerso(p);
        for (let i = 0; i < 10; i++)
            obs.push(moi.main[i] ?? 0);
        for (const t of moi.pieges)
            obs.push(t ?? 0);
        for (const t of lui.pieges)
            obs.push(t !== null ? 1 : 0); // caché : présence seule
        obs.push(moi.envIncline ? 1 : 0, moi.artefactUtilise ? 1 : 0, lui.artefactUtilise ? 1 : 0);
        return obs;
    }
    cloner() {
        const c = new BlueRisingMoteur(this.decks[0], this.envs[0], this.arts[0], this.decks[1], this.envs[1], this.arts[1]);
        c.etat = BlueRisingMoteur.copierEtat(this.etat); // rngState inclus
        c.cacheLegales = null;
        return c;
    }
    // Accès lecture pour l'affichage/debug.
    lireEtat() { return this.etat; }
    /** Re-mélange l'information cachée du point de vue de `joueur` :
     *  son propre deck (ordre inconnu) + main et deck adverses (contenus
     *  inconnus, effectifs connus). Les pièges posés restent connus (v0.2,
     *  simplification notée dans le README). */
    determiniser(joueur) {
        const moi = this.etat.joueurs[joueur];
        const adv = this.etat.joueurs[1 - joueur];
        moi.deck = this.melanger(moi.deck);
        const pool = this.melanger(adv.main.concat(adv.deck));
        adv.main = pool.slice(0, adv.main.length);
        adv.deck = pool.slice(adv.main.length);
        this.cacheLegales = null;
    }
    /** Helpers publics pour heuristiques/affichage (mêmes calculs que le combat). */
    pubAttaque(j, slot) { return this.puissanceAttaque(j, slot); }
    pubDefense(j, slot) { return this.puissanceDefense(j, slot); }
    /** Bilan du combat en cours (bonus inclus), ou null hors combat. */
    bilanCombat() {
        const e = this.etat;
        if (!e.attaque)
            return null;
        const att = e.attaque;
        const pAtt = this.puissanceAttaque(e.actif, att.slotAtt) + att.bonusAtt;
        const adv = e.joueurs[1 - e.actif];
        const pDef = att.slotDef === null
            ? CARTES[adv.env].puissance
            : this.puissanceDefense((1 - e.actif), att.slotDef) + att.bonusDef;
        return { pAtt, pDef, slotDef: att.slotDef };
    }
    /** Copie manuelle : ~15x plus rapide que structuredClone (forme connue). */
    static copierCote(c) {
        return {
            deck: c.deck.slice(), main: c.main.slice(), defausse: c.defausse.slice(),
            plateau: c.plateau.map((p) => (p ? { ...p } : null)),
            pieges: c.pieges.slice(),
            env: c.env, envIncline: c.envIncline,
            artefact: c.artefact, artefactUtilise: c.artefactUtilise,
            pv: c.pv, pvCeTour: c.pvCeTour, resGen: c.resGen, resFac: c.resFac,
            buffs: c.buffs.map((b) => ({ ...b })),
            aPlacer: c.aPlacer.slice(), mulliganAside: c.mulliganAside.slice(),
        };
    }
    static copierEtat(e) {
        return {
            rngState: e.rngState,
            joueurs: [BlueRisingMoteur.copierCote(e.joueurs[0]),
                BlueRisingMoteur.copierCote(e.joueurs[1])],
            tour: e.tour, actif: e.actif, phase: e.phase,
            pending: e.pending ? { ...e.pending } : null,
            attaque: e.attaque ? { ...e.attaque } : null,
            finie: e.finie, recompense: e.recompense,
        };
    }
    // =============== Phase principale ===============
    jouerMain(j, action) {
        const e = this.etat, cj = e.joueurs[j];
        if (action === PASS) {
            if (cj.main.length > 5) {
                e.phase = "defausseFin";
                return;
            }
            this.finirTour();
            return;
        }
        if (action >= DISC(0) && action < DISC(10)) {
            cj.defausse.push(cj.main.splice(action - DISC(0), 1)[0]);
            cj.resGen += 1;
            return;
        }
        if (action >= HAND(0) && action < HAND(10)) {
            const idx = action - HAND(0);
            const c = CARTES[cj.main[idx]];
            if (c.type === "personnage") {
                e.pending = { kind: "perso", handIdx: idx };
                e.phase = "slot";
                return;
            }
            if (c.type === "objet") {
                e.pending = { kind: "objet", handIdx: idx, carte: c.id };
                e.phase = "slot";
                return;
            }
            if (c.type === "piege") {
                e.pending = { kind: "piege", handIdx: idx };
                e.phase = "colonne";
                return;
            }
            // Événements
            if (c.effet === "ev_split") {
                this.payerEv(j, idx);
                this.splitOublie(cj);
                return;
            }
            if (c.effet === "ev_rugissement") {
                this.payerEv(j, idx);
                this.rugissement(j);
                return;
            }
            if (c.effet === "ev_campagne") {
                e.pending = { kind: "ev_campagne", handIdx: idx };
                e.phase = "slot";
                return;
            }
            if (c.effet === "ev_archives") {
                e.pending = { kind: "ev_archives", handIdx: idx };
                e.phase = "slot";
                return;
            }
            if (c.effet === "ev_adversaires") {
                e.pending = { kind: "ev_adversaires", handIdx: idx };
                e.phase = "slot";
                return;
            }
            if (c.effet === "ev_cri") {
                e.pending = { kind: "ev_cri", handIdx: idx };
                e.phase = "cible";
                return;
            }
            return;
        }
        if (action >= INCL(0) && action < INCL(6)) {
            const s = action - INCL(0), p = cj.plateau[s];
            p.incline = true;
            const eff = CARTES[p.carte].effet;
            if (eff === "tap_ressource1")
                cj.resGen += 1;
            if (eff === "tap_pioche1")
                this.piocher(j);
            return;
        }
        if (action === TAP_ENV) {
            cj.envIncline = true;
            cj.resFac += 2; // Sirap/Nilreb : 2 ressources restreintes à la faction
            return;
        }
        if (action === ARTEFACT) {
            this.activerArtefact(j);
            return;
        }
        if (action >= ATT(0) && action < ATT(6)) {
            const s = action - ATT(0);
            const p = cj.plateau[s];
            const distance = this.objetMots(p).includes("distance")
                || (!p.jeton && (CARTES[p.carte].motsCles.includes("distance")
                    || p.distanceTour === e.tour));
            if (distance) {
                e.pending = { kind: "attaque_cible", handIdx: s };
                e.phase = "cible";
            }
            else {
                e.pending = { kind: "attaque_cible", handIdx: s };
                e.phase = "colonne";
            }
            return;
        }
    }
    // =============== Attaque ===============
    lancerAttaque(j, slotAtt, distance, colonne, slotDefForce) {
        const e = this.etat, cj = e.joueurs[j], adv = e.joueurs[1 - j];
        cj.plateau[slotAtt].incline = true;
        let slotDef = slotDefForce;
        if (!distance) {
            if (adv.plateau[colonne])
                slotDef = colonne; // Avant
            else if (adv.plateau[colonne + 3])
                slotDef = colonne + 3; // Arrière
            else
                slotDef = null; // vide
        }
        e.attaque = { slotAtt, distance, colonne, slotDef, bonusAtt: 0, bonusDef: 0 };
        if (!distance && slotDef === null && adv.plateau.some((p) => p && !p.incline)) {
            e.phase = "bloc";
            return; // le défenseur peut interposer un personnage
        }
        e.phase = "piege";
        this.avancerApresPiege();
    }
    avancerApresPiege() {
        const e = this.etat, adv = e.joueurs[1 - e.actif];
        const piege = adv.pieges[e.attaque.colonne];
        if (piege === null || adv.main.length < CARTES[piege].cout) {
            e.phase = "soutienAtt";
            this.avancerSoutienAtt();
        }
        // sinon on reste en phase "piege" : le défenseur décide.
    }
    /** Recalcul forcé : les helpers internes ne doivent JAMAIS lire le cache. */
    legalesFraiches() {
        this.cacheLegales = null;
        return this.actionsLegales();
    }
    avancerSoutienAtt() {
        const e = this.etat;
        if (this.legalesFraiches().length <= 1) { // seulement PASS
            e.phase = "soutienDef";
            this.avancerSoutienDef();
        }
    }
    avancerSoutienDef() {
        const e = this.etat;
        if (e.attaque === null)
            return; // l'attaque a été annulée par un piège
        if (e.attaque.slotDef === null || this.legalesFraiches().length <= 1)
            this.resoudreCombat();
    }
    activerPiege(defenseur) {
        const e = this.etat, cj = e.joueurs[defenseur], att = e.attaque;
        const adv = e.joueurs[1 - defenseur];
        const id = cj.pieges[att.colonne];
        cj.pieges[att.colonne] = null;
        this.payerAuto(cj, CARTES[id].cout);
        cj.defausse.push(id);
        switch (CARTES[id].effet) {
            case "piege_pioche3":
                for (let k = 0; k < 3; k++)
                    this.piocher(defenseur);
                break;
            case "piege_glace":
                att.bonusDef += 4;
                break;
            case "piege_chouette": {
                const d = att.slotDef !== null ? cj.plateau[att.slotDef] : null;
                att.bonusDef += 2 + (d && !d.jeton && CARTES[d.carte].faction === "veilleur" ? 2 : 0);
                break;
            }
            case "piege_fumigene": {
                this.creerJetons(defenseur, 2);
                // Ré-identification : un jeton a pu apparaître dans la colonne attaquée.
                if (!att.distance && att.slotDef === null) {
                    if (cj.plateau[att.colonne])
                        att.slotDef = att.colonne;
                    else if (cj.plateau[att.colonne + 3])
                        att.slotDef = att.colonne + 3;
                }
                break;
            }
            case "piege_communique":
                for (const p of cj.plateau)
                    if (p)
                        p.incline = false;
                break;
            case "piege_kc": {
                const a = adv.plateau[att.slotAtt];
                this.defausserEquipement(adv, a);
                adv.plateau[att.slotAtt] = null;
                if (!a.jeton)
                    adv.main.push(a.carte);
                const d = att.slotDef !== null ? cj.plateau[att.slotDef] : null;
                if (d && (d.jeton || CARTES[d.carte].faction !== "veilleur")) {
                    this.defausserEquipement(cj, d);
                    cj.plateau[att.slotDef] = null;
                    if (!d.jeton)
                        cj.main.push(d.carte);
                }
                e.attaque = null;
                e.phase = "main";
                return; // attaque terminée
            }
            case "piege_faussealerte": {
                const d = att.slotDef !== null ? cj.plateau[att.slotDef] : null;
                if (d) {
                    this.defausserEquipement(cj, d);
                    cj.plateau[att.slotDef] = null;
                    if (!d.jeton)
                        cj.main.push(d.carte);
                }
                e.attaque = null;
                e.phase = "main";
                return; // attaque terminée
            }
        }
        e.phase = "soutienAtt";
        this.avancerSoutienAtt();
    }
    resoudreCombat() {
        const e = this.etat, att = e.attaque;
        const j = e.actif, cj = e.joueurs[j], adv = e.joueurs[1 - j];
        const attaquant = cj.plateau[att.slotAtt];
        const pAtt = this.puissanceAttaque(j, att.slotAtt) + att.bonusAtt;
        // ----- Défenseur = Environnement -----
        if (att.slotDef === null) {
            const pDef = CARTES[adv.env].puissance;
            if (pAtt > pDef) {
                this.marquer(j, 1);
                if (!attaquant.jeton) { // récupération (un jeton, lui, reste en jeu)
                    this.defausserEquipement(cj, attaquant);
                    cj.main.push(attaquant.carte);
                    cj.plateau[att.slotAtt] = null;
                }
            }
            e.attaque = null;
            e.phase = "main";
            return;
        }
        // ----- Défenseur = Personnage -----
        const def = adv.plateau[att.slotDef];
        const pDef = this.puissanceDefense(1 - j, att.slotDef) + att.bonusDef;
        if (pAtt > pDef) {
            this.defausserEquipement(adv, def); // l'Objet du défenseur détruit part en défausse
            adv.plateau[att.slotDef] = null;
            let pts = 0;
            if (def.jeton) { /* retiré du jeu, 0 PV */ }
            else {
                adv.defausse.push(def.carte);
                const st = CARTES[def.carte].sousType;
                pts = st === "heros" ? 1 : st === "legende" ? 2 : 0;
            }
            if (pts > 0) {
                this.marquer(j, pts);
                const resteEffet = !attaquant.jeton &&
                    CARTES[attaquant.carte].effet === "reste_si_tue_heros" &&
                    !def.jeton && CARTES[def.carte].sousType === "heros";
                if (attaquant.jeton) { /* un jeton ne retourne jamais en main */ }
                else if (resteEffet) { /* Canna reste en jeu */ }
                else {
                    // Fenêtre Triomphe si l'attaquant a la carte et une cible Héros.
                    const aTriomphe = !def.jeton && CARTES[def.carte].sousType === "heros" &&
                        cj.main.some((id) => CARTES[id].effet === "ev_triomphe");
                    if (aTriomphe) {
                        e.phase = "triomphe";
                        return;
                    }
                    this.defausserEquipement(cj, attaquant);
                    cj.main.push(attaquant.carte);
                    cj.plateau[att.slotAtt] = null; // récupération
                }
            }
        }
        else {
            // Le défenseur gagne (égalité comprise). Contre-Attaque ?
            if (!def.jeton && CARTES[def.carte].motsCles.includes("contreattaque")) {
                this.defausserEquipement(cj, attaquant);
                cj.plateau[att.slotAtt] = null;
                if (!attaquant.jeton) {
                    cj.defausse.push(attaquant.carte);
                    const st = CARTES[attaquant.carte].sousType;
                    const pts = st === "heros" ? 1 : st === "legende" ? 2 : 0;
                    if (pts > 0)
                        this.marquer((1 - j), pts);
                }
            }
        }
        e.attaque = null;
        e.phase = "main";
    }
    // =============== Calculs de puissance ===============
    puissanceBase(j, slot) {
        const p = this.etat.joueurs[j].plateau[slot];
        return p.jeton ? 1 : CARTES[p.carte].puissance;
    }
    buffsPour(j, slot) {
        let att = 0, def = 0;
        for (const b of this.etat.joueurs[j].buffs)
            if (b.slot === slot) {
                att += b.att;
                def += b.def;
            }
        return { att, def };
    }
    puissanceAttaque(j, slot) {
        const cj = this.etat.joueurs[j], p = cj.plateau[slot];
        let v = this.puissanceBase(j, slot) + this.buffsPour(j, slot).att + this.objetStat(p, "att");
        if (!p.jeton) {
            const eff = CARTES[p.carte].effet;
            if (eff === "attaque_plus2")
                v += 2;
            if (eff === "attaque_plus3")
                v += 3;
            // Aura Nisqy : les AUTRES Gardiens gagnent Attaque +1.
            if (CARTES[p.carte].faction === "gardien")
                for (let s = 0; s < 6; s++) {
                    const q = cj.plateau[s];
                    if (s !== slot && q && !q.jeton && CARTES[q.carte].effet === "aura_gardien_att1")
                        v += 1;
                }
        }
        return v;
    }
    puissanceDefense(j, slot) {
        const cj = this.etat.joueurs[j], p = cj.plateau[slot];
        let v = this.puissanceBase(j, slot) + this.buffsPour(j, slot).def + this.objetStat(p, "def");
        // Aura Avez : les AUTRES Veilleurs gagnent Défense +1.
        if (!p.jeton && CARTES[p.carte].faction === "veilleur")
            for (let s = 0; s < 6; s++) {
                const q = cj.plateau[s];
                if (s !== slot && q && !q.jeton && CARTES[q.carte].effet === "aura_veilleur_def1")
                    v += 1;
            }
        return v;
    }
    // =============== Effets et utilitaires ===============
    poserPerso(j, handIdx, slot) {
        const cj = this.etat.joueurs[j];
        const id = cj.main.splice(handIdx, 1)[0];
        this.payerPerso(cj, CARTES[id]);
        const occupant = cj.plateau[slot];
        if (occupant) { // remplacement : la cible ET son Objet éventuel partent en défausse
            this.defausserEquipement(cj, occupant);
            if (!occupant.jeton)
                cj.defausse.push(occupant.carte);
        }
        cj.plateau[slot] = { carte: id, jeton: false, incline: false, poseTour: this.etat.tour, objet: null };
        const eff = CARTES[id].effet;
        if (eff === "etb_pioche1")
            this.piocher(j);
        if (eff === "etb_jeton1")
            this.creerJetons(j, 1);
        if (eff === "etb_jeton2")
            this.creerJetons(j, 2);
    }
    resoudreCampagne(j, slot, handIdx) {
        const cj = this.etat.joueurs[j];
        this.payerEv(j, handIdx);
        const p = cj.plateau[slot];
        this.defausserEquipement(cj, p); // le perso renvoyé/défaussé perd son Objet
        cj.plateau[slot] = null;
        if (p.jeton) {
            for (let k = 0; k < 3; k++)
                this.piocher(j);
        }
        else {
            cj.main.push(p.carte);
            for (let k = 0; k < 2; k++)
                this.piocher(j);
        }
    }
    splitOublie(cj) {
        for (let s = 0; s < 6; s++)
            if (cj.plateau[s]?.jeton)
                cj.buffs.push({ slot: s, att: 2, def: 2 });
    }
    rugissement(j) {
        const cj = this.etat.joueurs[j];
        for (let s = 0; s < 6; s++) {
            const p = cj.plateau[s];
            if (p && !p.jeton && CARTES[p.carte].faction === "gardien")
                cj.buffs.push({ slot: s, att: 1, def: 0 });
        }
    }
    activerArtefact(j) {
        const cj = this.etat.joueurs[j];
        cj.artefactUtilise = true;
        const eff = CARTES[cj.artefact].effet;
        if (eff === "art_orbe")
            this.creerJetons(j, 6);
        if (eff === "art_disque")
            for (const p of cj.plateau)
                if (p)
                    p.incline = false;
    }
    conditionArtefact(j) {
        const cj = this.etat.joueurs[j];
        const eff = CARTES[cj.artefact].effet;
        if (eff === "art_orbe")
            return cj.plateau.filter((p) => p).length < 2;
        if (eff === "art_disque")
            return cj.pvCeTour >= 2;
        return false;
    }
    creerJetons(j, n) {
        const cj = this.etat.joueurs[j];
        for (let s = 0; s < 6 && n > 0; s++)
            if (!cj.plateau[s]) {
                cj.plateau[s] = { carte: JETON_ECUYER, jeton: true, incline: false, poseTour: this.etat.tour, objet: null };
                n--;
            }
    }
    piocher(j) {
        const cj = this.etat.joueurs[j];
        if (cj.deck.length === 0) {
            if (cj.defausse.length === 0)
                return;
            cj.deck = this.melanger(cj.defausse);
            cj.defausse = [];
            this.marquer((1 - j), 1); // deck-out : 1 PV à l'adversaire
            if (this.etat.finie)
                return;
        }
        cj.main.push(cj.deck.pop());
    }
    finirTour() {
        const e = this.etat, cj = e.joueurs[e.actif];
        while (cj.main.length < 5) {
            const avant = cj.main.length;
            this.piocher(e.actif);
            if (cj.main.length === avant || e.finie)
                break; // deck + défausse vides / fin
        }
        cj.resGen = 0;
        cj.resFac = 0;
        cj.buffs = [];
        e.tour += 1;
        e.actif = (1 - e.actif);
        const nv = e.joueurs[e.actif];
        for (const p of nv.plateau)
            if (p)
                p.incline = false;
        nv.envIncline = false;
        nv.pvCeTour = 0;
        e.phase = "main";
        e.pending = null;
        e.attaque = null;
    }
    marquer(j, pts) {
        const cj = this.etat.joueurs[j];
        cj.pv += pts;
        cj.pvCeTour += pts;
        this.verifierVictoire();
    }
    verifierVictoire() {
        const e = this.etat;
        for (const j of [0, 1])
            if (e.joueurs[j].pv >= 5) {
                e.finie = true;
                e.phase = "over";
                e.recompense = j === 0 ? 1 : -1;
            }
    }
    // ----- paiements -----
    affordablePerso(cj, c) {
        const envFac = CARTES[cj.env].effet === "env_ressources_veilleur" ? "veilleur"
            : CARTES[cj.env].effet === "env_ressources_gardien" ? "gardien" : null;
        const fac = c.faction === envFac ? cj.resFac : 0;
        return cj.resGen + fac >= c.cout;
    }
    payerPerso(cj, c) {
        const envFac = CARTES[cj.env].effet === "env_ressources_veilleur" ? "veilleur"
            : CARTES[cj.env].effet === "env_ressources_gardien" ? "gardien" : null;
        let reste = c.cout;
        if (c.faction === envFac) {
            const u = Math.min(cj.resFac, reste);
            cj.resFac -= u;
            reste -= u;
        }
        cj.resGen -= reste;
    }
    payerEv(j, handIdx) {
        const cj = this.etat.joueurs[j];
        const id = cj.main.splice(handIdx, 1)[0];
        cj.resGen -= CARTES[id].cout;
        cj.defausse.push(id);
    }
    payerAuto(cj, cout) {
        const deRes = Math.min(cj.resGen, cout);
        cj.resGen -= deRes;
        cout -= deRes;
        while (cout > 0 && cj.main.length > 0) {
            cj.defausse.push(cj.main.pop());
            cout--;
        }
    }
    // ----- règles diverses -----
    uniciteViolee(cj, id) {
        return cj.plateau.some((p) => p && !p.jeton && p.carte === id);
    }
    legendeOK(j, c) {
        if (c.sousType !== "legende")
            return true;
        return this.etat.joueurs[1 - j].pv >= 1; // jouable si l'adversaire a marqué
    }
    evJouable(cj, c) {
        if (c.effet === "ev_campagne")
            return cj.plateau.some((p) => p);
        if (c.effet === "ev_archives" || c.effet === "ev_adversaires")
            return cj.plateau.some((p) => p && !p.jeton);
        if (c.effet === "ev_cri")
            return cj.plateau.filter((p) => p).length >= 2;
        if (c.effet === "ev_split")
            return cj.plateau.some((p) => p?.jeton);
        return true;
    }
    desoriente(j, p) {
        if (p.poseTour !== this.etat.tour || this.etat.actif !== j)
            return false;
        return p.jeton || !CARTES[p.carte].motsCles.includes("rage");
    }
    adjacents(a, b) {
        const ca = a % 3, cb = b % 3, ra = a < 3 ? 0 : 1, rb = b < 3 ? 0 : 1;
        return (ca === cb && ra !== rb) || (ra === rb && Math.abs(ca - cb) === 1);
    }
    buff(cj, slot, att, def) {
        cj.buffs.push({ slot, att, def });
    }
    // ----- Objets (équipement) -----
    /** Modificateur passif de l'Objet équipé sur `p` (0 si aucun / non répertorié). */
    objetStat(p, key) {
        return p.objet !== null ? (OBJET_BONUS[p.objet]?.[key] ?? 0) : 0;
    }
    /** Mots-clés conférés par l'Objet équipé (ex. "distance", "resistant"). */
    objetMots(p) {
        return p.objet !== null ? (OBJET_BONUS[p.objet]?.mots ?? []) : [];
    }
    /** Soutien effectif d'un perso (base + Objet ; un jeton ne soutient pas). */
    soutienDe(j, slot) {
        const p = this.etat.joueurs[j].plateau[slot];
        return (p.jeton ? 0 : CARTES[p.carte].soutien) + this.objetStat(p, "soutien");
    }
    /** Coût pour équiper `objetId` sur la case `slot` (Jiraya / Kameto -> 0). */
    coutObjet(cj, slot, objetId) {
        if (cj.plateau.some((p) => p && !p.jeton && CARTES[p.carte].nom === "Kameto"))
            return 0;
        const t = cj.plateau[slot];
        if (t && !t.jeton && CARTES[t.carte].nom === "Jiraya")
            return 0;
        return CARTES[objetId].cout;
    }
    /** Existe-t-il une cible sur laquelle l'Objet est jouable et payable ? */
    objetJouable(cj, objetId) {
        for (let s = 0; s < 6; s++)
            if (cj.plateau[s] && cj.resGen >= this.coutObjet(cj, s, objetId))
                return true;
        return false;
    }
    /** Paie et équipe l'Objet `handIdx` de la main sur `slot` (remplace l'ancien). */
    equiperObjet(j, handIdx, slot) {
        const cj = this.etat.joueurs[j];
        const cout = this.coutObjet(cj, slot, cj.main[handIdx]);
        const id = cj.main.splice(handIdx, 1)[0];
        cj.resGen -= cout;
        const p = cj.plateau[slot];
        if (p.objet !== null)
            cj.defausse.push(p.objet); // l'Objet remplacé est défaussé
        p.objet = id;
    }
    /** Quand un perso quitte le jeu : son Objet éventuel part en défausse. */
    defausserEquipement(cj, p) {
        if (p.objet !== null) {
            cj.defausse.push(p.objet);
            p.objet = null;
        }
    }
    /** Un pas de mulberry32 sur l'état : déterministe, clonable, sérialisable. */
    rand() {
        let a = (this.etat.rngState + 0x6d2b79f5) >>> 0;
        this.etat.rngState = a;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    melanger(t) {
        for (let i = t.length - 1; i > 0; i--) {
            const k = Math.floor(this.rand() * (i + 1));
            [t[i], t[k]] = [t[k], t[i]];
        }
        return t;
    }
}
