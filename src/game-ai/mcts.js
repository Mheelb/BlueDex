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
class Noeud {
    parent;
    actionVenue;
    joueurQuiChoisit;
    visites = 0;
    score = 0; // somme des récompenses, point de vue J0
    enfants = new Map();
    constructor(parent, actionVenue, joueurQuiChoisit) {
        this.parent = parent;
        this.actionVenue = actionVenue;
        this.joueurQuiChoisit = joueurQuiChoisit;
    }
}
export class AgentMCTS {
    nbSimulations;
    cUcb;
    rng;
    opts;
    constructor(nbSimulations = 2000, cUcb = 1.4, rng = Math.random, opts = {}) {
        this.nbSimulations = nbSimulations;
        this.cUcb = cUcb;
        this.rng = rng;
        this.opts = { capRollout: 800, ...opts };
    }
    legales(m) {
        if (this.opts.filtre) {
            const f = this.opts.filtre(m);
            if (f.length > 0)
                return f;
        }
        return m.actionsLegales();
    }
    choisir(moteur) {
        const racineLegales = this.legales(moteur);
        if (racineLegales.length === 1)
            return racineLegales[0];
        const joueurRacine = moteur.joueurADecider();
        const racine = new Noeud(null, -1, joueurRacine);
        for (let i = 0; i < this.nbSimulations; i++) {
            const copie = moteur.cloner();
            if (this.opts.determinisation && copie.determiniser)
                copie.determiniser(joueurRacine);
            // 1+2. SÉLECTION/EXPANSION robustes : à chaque nœud on recalcule les
            // actions légales de CETTE determinization ; on développe une action
            // inédite si possible, sinon on descend par UCB parmi les légales.
            let noeud = racine;
            let recompense = 0, terminee = false;
            while (!terminee) {
                const acts = this.legales(copie);
                if (acts.length === 0)
                    break;
                const inedites = acts.filter((a) => !noeud.enfants.has(a));
                if (inedites.length > 0) {
                    const a = inedites[Math.floor(this.rng() * inedites.length)];
                    ({ recompense, terminee } = copie.jouer(a));
                    const enfant = new Noeud(noeud, a, terminee ? -1 : copie.joueurADecider());
                    noeud.enfants.set(a, enfant);
                    noeud = enfant;
                    break; // -> rollout
                }
                let meilleur = null, mv = -Infinity;
                for (const a of acts) {
                    const enf = noeud.enfants.get(a);
                    const v = enf.score / enf.visites +
                        this.cUcb * Math.sqrt(Math.log(noeud.visites + 1) / enf.visites);
                    if (v > mv) {
                        mv = v;
                        meilleur = enf;
                    }
                }
                noeud = meilleur;
                ({ recompense, terminee } = copie.jouer(noeud.actionVenue));
            }
            // 3. SIMULATION (rollout guidé si fourni, sinon aléatoire filtré).
            let pas = 0;
            while (!terminee && pas < this.opts.capRollout) {
                const a = this.opts.rollout
                    ? this.opts.rollout(copie, this.rng)
                    : (() => {
                        const l = this.legales(copie);
                        return l[Math.floor(this.rng() * l.length)];
                    })();
                ({ recompense, terminee } = copie.jouer(a));
                pas++;
            }
            if (!terminee)
                recompense = 0; // partie trop longue : comptée nulle
            // 4. RÉTROPROPAGATION (identique v0.1).
            let n = noeud;
            while (n !== null) {
                n.visites++;
                if (n.parent !== null) {
                    const pdv = n.parent.joueurQuiChoisit === 0 ? 1 : -1;
                    n.score += recompense * pdv;
                }
                n = n.parent;
            }
        }
        let meilleure = racineLegales[0], maxVisites = -1;
        for (const [action, enfant] of racine.enfants)
            if (enfant.visites > maxVisites) {
                maxVisites = enfant.visites;
                meilleure = action;
            }
        return meilleure;
    }
}
/** Adversaire de référence : joue au hasard (l'étalon zéro de toute mesure). */
export class AgentAleatoire {
    rng;
    constructor(rng = Math.random) {
        this.rng = rng;
    }
    choisir(moteur) {
        const a = moteur.actionsLegales();
        return a[Math.floor(this.rng() * a.length)];
    }
}
