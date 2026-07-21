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
import { AgentMCTS } from "./mcts.js";
import { PASS, HAND, DISC, SLOT, COL, INCL, TAP_ENV, ARTEFACT, ATT, TRAP } from "./blueRising.js";
import { CARTES } from "./cartes.js";
const adjacents = (a, b) => {
    const ca = a % 3, cb = b % 3, ra = a < 3 ? 0 : 1, rb = b < 3 ? 0 : 1;
    return (ca === cb && ra !== rb) || (ra === rb && Math.abs(ca - cb) === 1);
};
/** Meilleur soutien inclinable adjacent à `slot` (0 si aucun). */
function soutienMax(e, j, slot, sonTour) {
    let best = 0;
    for (let s = 0; s < 6; s++) {
        const p = e.joueurs[j].plateau[s];
        if (!p || p.incline || s === slot || !adjacents(s, slot))
            continue;
        if (sonTour && p.poseTour === e.tour)
            continue; // désorientation
        best = Math.max(best, p.jeton ? 0 : CARTES[p.carte].soutien);
    }
    return best;
}
/** L'attaque du perso `slot` a-t-elle AU MOINS une cible battable ? */
function attaqueUtile(m, slot) {
    const e = m.lireEtat();
    const j = m.joueurADecider();
    const adv = e.joueurs[1 - j];
    const pAtt = m.pubAttaque(j, slot) + soutienMax(e, j, slot, true);
    const p = e.joueurs[j].plateau[slot];
    const distance = p && !p.jeton && CARTES[p.carte].motsCles.includes("distance");
    if (distance) {
        for (let s = 0; s < 6; s++)
            if (adv.plateau[s] && pAtt > m.pubDefense((1 - j), s))
                return true;
        return false;
    }
    for (let c = 0; c < 3; c++) {
        const slotDef = adv.plateau[c] ? c : adv.plateau[c + 3] ? c + 3 : null;
        const pDef = slotDef === null ? CARTES[adv.env].puissance
            : m.pubDefense((1 - j), slotDef);
        if (pAtt > pDef)
            return true;
    }
    return false;
}
/** Défausser pour une ressource a-t-il un projet derrière ? */
function defausseUtile(m) {
    const e = m.lireEtat();
    const j = m.joueurADecider();
    const cj = e.joueurs[j];
    const dispo = cj.resGen + cj.resFac + (cj.envIncline ? 0 : 2);
    for (const id of cj.main) {
        const c = CARTES[id];
        if (c.type === "personnage" || c.type === "evenement") {
            // Une carte trop chère MAINTENANT mais payable en défaussant le reste ?
            if (c.cout > cj.resGen && c.cout <= dispo + cj.main.length - 1)
                return true;
        }
    }
    return false;
}
export function filtreBR(mot) {
    const m = mot;
    const all = m.actionsLegales();
    const e = m.lireEtat();
    const ph = e.phase;
    const out = [];
    for (const a of all) {
        // Une attaque déclarée se choisit une cible : pas d'annulation-bruit.
        if ((ph === "colonne" || ph === "cible" || ph === "slot") && a === PASS &&
            e.pending && all.length > 1)
            continue;
        if (ph === "main") {
            if (a >= DISC(0) && a < DISC(0) + 10 && !defausseUtile(m))
                continue;
            if (a >= ATT(0) && a < ATT(0) + 6 && !attaqueUtile(m, a - ATT(0)))
                continue;
        }
        if ((ph === "soutienAtt" || ph === "soutienDef") &&
            a >= INCL(0) && a < INCL(0) + 6) {
            const p = e.joueurs[m.joueurADecider()].plateau[a - INCL(0)];
            if (p && (p.jeton || CARTES[p.carte].soutien === 0))
                continue;
        }
        out.push(a);
    }
    return out.length > 0 ? out : all;
}
/** Tirage pondéré. */
function pondere(rng, choix) {
    let total = 0;
    for (const c of choix)
        total += c.w;
    let r = rng() * total;
    for (const c of choix) {
        r -= c.w;
        if (r <= 0)
            return c.a;
    }
    return choix[choix.length - 1].a;
}
export function rolloutBR(mot, rng) {
    const m = mot;
    const acts = filtreBR(m);
    if (acts.length === 1)
        return acts[0];
    const e = m.lireEtat();
    const j = m.joueurADecider();
    const cj = e.joueurs[j];
    const ph = e.phase;
    // --- Soutiens : uniquement si ça change l'issue, et le plus petit qui suffit.
    if (ph === "soutienAtt" || ph === "soutienDef") {
        const b = m.bilanCombat();
        if (b) {
            const attaquantGagne = b.pAtt > b.pDef;
            const utile = (ph === "soutienAtt") ? !attaquantGagne : attaquantGagne;
            if (!utile)
                return PASS;
            let meilleur = PASS, plusPetit = Infinity;
            for (const a of acts) {
                if (a < INCL(0) || a >= INCL(0) + 6)
                    continue;
                const p = cj.plateau[a - INCL(0)];
                const val = p.jeton ? 0 : CARTES[p.carte].soutien;
                const suffit = (ph === "soutienAtt")
                    ? b.pAtt + val > b.pDef
                    : b.pDef + val >= b.pAtt;
                if (suffit && val < plusPetit) {
                    plusPetit = val;
                    meilleur = a;
                }
            }
            return meilleur;
        }
    }
    // --- Blocage : sacrifier le moins précieux (jeton > aspirant > héros ; on
    // ne jette pas une Légende sous un bus, sauf si c'est la seule option).
    if (ph === "bloc") {
        const valeur = (s) => {
            const p = cj.plateau[s];
            if (p.jeton)
                return 0;
            const st = CARTES[p.carte].sousType;
            return st === "aspirant" ? 1 : st === "heros" ? 3 : 6;
        };
        let meilleur = PASS, vmin = 5; // seuil : on préfère laisser passer qu'exposer une Légende
        for (const a of acts)
            if (a >= INCL(0) && a < INCL(0) + 6 && valeur(a - INCL(0)) < vmin) {
                vmin = valeur(a - INCL(0));
                meilleur = a;
            }
        return meilleur;
    }
    // --- Piège : l'activer presque toujours (il a été posé pour ça).
    if (ph === "piege")
        return acts.includes(TRAP) && rng() < 0.85 ? TRAP : PASS;
    // --- Choix d'emplacement : préférer les cases libres (ne pas écraser).
    if (ph === "slot") {
        const choix = acts.map((a) => {
            if (a === PASS)
                return { a, w: 0.3 };
            const s = a - SLOT(0);
            const occ = cj.plateau[s];
            if (e.pending?.kind === "ev_campagne")
                return { a, w: occ?.jeton ? 8 : 1 }; // bounce un jeton = pioche 3
            return { a, w: occ ? 0.5 : 5 };
        });
        return pondere(rng, choix);
    }
    // --- Cible de colonne d'attaque : viser ce qui rapporte et se bat.
    if (ph === "colonne" && e.pending?.kind === "attaque_cible") {
        const slotAtt = e.pending.handIdx;
        const adv = e.joueurs[1 - j];
        const pAtt = m.pubAttaque(j, slotAtt);
        const choix = acts.filter((a) => a >= COL(0) && a < COL(0) + 3).map((a) => {
            const c = a - COL(0);
            const slotDef = adv.plateau[c] ? c : adv.plateau[c + 3] ? c + 3 : null;
            if (slotDef === null)
                return { a, w: pAtt > CARTES[adv.env].puissance ? 6 : 0.5 }; // env = 1 PV
            const p = adv.plateau[slotDef];
            const pDef = m.pubDefense((1 - j), slotDef);
            const grade = p.jeton ? 0.5 : CARTES[p.carte].sousType === "heros" ? 5
                : CARTES[p.carte].sousType === "legende" ? 8 : 1;
            return { a, w: pAtt > pDef ? grade : 0.2 };
        });
        return choix.length ? pondere(rng, choix) : acts[Math.floor(rng() * acts.length)];
    }
    // --- Phase principale : priorités de joueur.
    if (ph === "main") {
        const choix = acts.map((a) => {
            if (a === PASS)
                return { a, w: 1.2 };
            if (a >= HAND(0) && a < HAND(0) + 10) {
                const c = CARTES[cj.main[a - HAND(0)]];
                return { a, w: c.type === "personnage" ? 6 : c.type === "piege" ? 4 : 3 };
            }
            if (a >= DISC(0) && a < DISC(0) + 10)
                return { a, w: 0.8 };
            if (a >= ATT(0) && a < ATT(0) + 6)
                return { a, w: 5 };
            if (a >= INCL(0) && a < INCL(0) + 6)
                return { a, w: 3 };
            if (a === TAP_ENV)
                return { a, w: 2.5 };
            if (a === ARTEFACT)
                return { a, w: 7 };
            return { a, w: 1 };
        });
        return pondere(rng, choix);
    }
    return acts[Math.floor(rng() * acts.length)];
}
/** L'agent Blue Rising complet : MCTS + filtre + rollout guidé + info cachée. */
export function creerAgentBR(sims, rng, determinisation = true) {
    return new AgentMCTS(sims, 1.4, rng, { filtre: filtreBR, rollout: rolloutBR, determinisation, capRollout: 700 });
}
