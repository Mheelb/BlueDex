# Règles complètes de Blue Rising

> Source : https://bluerising.fr/pages/regles-du-jeu
> Document de référence pour le moteur de jeu (`/admin/partie`). Le champ `effect`
> des cartes étant du texte libre, le moteur applique la **structure** du jeu
> (zones, phases, ressources, points de victoire, attaque) et laisse le joueur
> appliquer les effets de carte manuellement.

## Présentation générale

Blue Rising est un jeu de cartes tactique où chaque joueur dirige une équipe de
combattants s'affrontant dans une arène. L'univers puise dans l'histoire de la
Karmine Corp avec ses héros et légendes.

## But du jeu

Le premier joueur qui réussit à récolter **5 Points de Victoire** en détruisant
des personnages adverses ou en parvenant à attaquer leur Environnement remporte
la partie.

## Construction du deck (format normal)

Un deck valide comprend exactement **42 cartes** respectant ces conditions :

- Maximum **3 cartes** portant le même nom
- Minimum **4 Aspirants différents** (de type Personnage)
- Exactement **1 Environnement** et **1 Artefact**

## Types de cartes

Six catégories : **Personnage, Événement, Piège, Objet, Environnement, Artefact**.
Chaque type possède des mécaniques spécifiques de jeu et d'activation.

## Règle primordiale

> Si le texte d'une carte contredit les règles, alors c'est le texte de la carte
> qui prévaut.

## Mise en place

1. Chaque joueur place son **Environnement face visible**.
2. Chaque joueur place son **Artefact face cachée**.
3. Détermination **aléatoire** du premier joueur.
4. Chaque joueur sélectionne **4 Aspirants distincts**, placés face cachée.
5. Les decks sont mélangés et positionnés ; un espace pour la défausse est réservé.
6. Le **premier joueur pioche 3 cartes** ; son **adversaire en pioche 5**.
7. **Mulligan** optionnel (une seule utilisation) : défausser des cartes pour en
   repiocher autant.
8. Préparation du suivi des points de victoire.
9. Les 4 Aspirants sont **révélés** ; les effets « En arrivant en jeu » s'activent.

## Structure du terrain

L'arène comprend **deux camps opposés**. Chaque camp contient :

- Un **Environnement**
- Deux lignes (**Avant** et **Arrière**) avec **3 emplacements de Personnage** chacune
- **3 emplacements de Piège** (un devant chaque colonne)

## Structure d'un tour

Trois phases successives :

### Phase 1 — Début de tour

Tous les personnages du joueur actif se **redressent**.

### Phase 2 — Phase principale

Le joueur actif réalise des actions dans l'ordre souhaité, **sans limite de
répétition** : Jouer une carte, Activer un effet, Attaquer.

### Phase 3 — Fin de tour

- Les bonus de puissance et mots-clés **prennent fin**.
- Le joueur peut **défausser volontairement** des cartes.
- Il **pioche jusqu'à avoir 5 cartes en main** (limite stricte en fin de tour uniquement).

## Système de ressources

Jouer une carte (sauf Piège) nécessite de payer son **coût** en ressources. Deux
méthodes de production :

- **Défausser des cartes de main** : chaque carte produit **1 ressource**.
- **Activer des effets** de cartes.

Les ressources s'accumulent dans une **réserve virtuelle** utilisable à tout
moment du tour. La réserve se **réinitialise en fin de phase principale**.

## Jouer un Personnage

Une fois le coût payé, le Personnage s'installe sur un emplacement disponible ou
**remplace** un personnage existant (qui est défaussé).

- **Désorientation** : un Personnage fraîchement joué ne peut ni **Attaquer** ni
  être **activé** (sauf pour soutenir) le même tour. Il peut se redresser pour
  soutenir dès le tour adverse.
- **Règle d'unicité** : impossible d'avoir plusieurs exemplaires du même Aspirant,
  Héros ou Légende simultanément en jeu.
- **Légendes** : jouables uniquement quand l'adversaire possède **au moins
  1 Point de Victoire**.
- **Factions** : trois factions (Émissaires, Gardiens, Veilleurs). Certaines
  cartes appliquent des effets supplémentaires selon la faction de la cible.

## Jouer un Objet

Une fois le coût payé, l'Objet est **équipé** sur un personnage (placé sous lui,
texte visible). Un Personnage ne porte qu'**un seul Objet** ; l'Objet remplacé
est défaussé.

## Jouer un Événement

Le coût est payé, l'**effet se résout**, puis l'Événement est **défaussé**.

## Jouer un Piège

Le Piège est posé **sans payer le coût**, **face cachée**, sur un emplacement de
Piège. Le coût est payé **uniquement à la révélation**. On peut poser un Piège
pendant une attaque adverse pour **1 ressource**. Une fois activé, le Piège est
défaussé.

## Activer un effet

Incliner une carte pour activer son effet. Elle se redresse au début du tour
suivant ou par effet de carte.

- **Durée des effets** : les bonus de puissance et mots-clés restent actifs
  « jusqu'à la fin du tour en cours ».
- **Renvoi en main** : si un Personnage équipé est renvoyé, l'Objet l'accompagne.

## Mécanique d'attaque

Un Attaquant (Personnage incliné) cible une **colonne** adverse :

1. **Choix de l'Attaquant** — le joueur actif incline son Personnage et désigne
   la colonne.
2. **a) Réaction adverse** — le défenseur peut poser un Piège (1 ressource) ou
   déplacer un Personnage d'une autre colonne vers celle attaquée.
   **b) Fenêtre d'action** — les joueurs activent des effets et jouent des
   Événements ; l'Attaquant a **priorité** en cas d'actions simultanées.
3. **a) Identification du Défenseur** — ordre de priorité : Personnage ligne
   **Avant** → Personnage ligne **Arrière** → **Environnement**.
   **b) Fenêtre d'action** — chaque joueur peut incliner un Personnage pour un
   **Soutien** (ajout de puissance), **un seul Soutien par attaque** et par joueur.
4. **Comparaison des puissances** — Puissance totale = base + Soutiens + bonus.
   - Attaquant ≤ Défenseur : le **Défenseur gagne**, l'attaque échoue.
   - Attaquant > Défenseur : l'**Attaquant gagne**.
5. **Résolution de la victoire**
   - Écuyer détruit : retiré du jeu, **0 point**.
   - Autre Personnage : défaussé, points selon grade (**1 Héros / 2 Légende**).
   - Environnement attaqué : reste en jeu, **1 point** marqué.

**Récupération** : l'Attaquant qui marque des points est **renvoyé en main** avec
ses Objets éventuels.

## Mots-clés

- **Avant/Arrière+X** : bonus de puissance selon la ligne occupée.
- **Défense+X** : bonus de puissance si déclaré Défenseur.
- **Attaque+X** : bonus de puissance si déclaré Attaquant.
- **Contre-Attaque** : si le Défenseur gagne, l'Attaquant est détruit ; le
  Défenseur marque les points et peut être renvoyé en main.
- **Attaque à distance** : cible un Personnage précis au lieu d'une colonne ; le
  Défenseur reste ciblé s'il se déplace.
- **Furtif** : quand le personnage Attaque, l'adversaire ne peut pas activer de Piège.
- **Rage** : pas soumis à la Désorientation ; peut Attaquer dès son arrivée.
- **Résistant** : non affecté par les cartes de l'adversaire, sauf s'il paie
  **1 ressource supplémentaire**.

## Deck épuisé

Si un joueur doit piocher sans cartes disponibles : la défausse est mélangée pour
reconstituer le deck, et l'**adversaire gagne 1 Point de Victoire**.

## Révélation d'Artefact

Quand les conditions de **Quête** sont satisfaites, l'Artefact peut être révélé et
son effet activé à tout moment. Une fois résolu, il est **retiré du jeu**.

## Fin de partie

La partie s'arrête **immédiatement** dès qu'un joueur atteint **5 Points de
Victoire**. Ce joueur gagne.

## Variante : Mode Rapide

- Decks de **31 cartes** (max 2 exemplaires chacune)
- Au minimum **3 Aspirants différents** ; exactement **1 Environnement**
- **Aucun Artefact**
- Victoire à **3 Points de Victoire**
- **3 Aspirants** en jeu initial (au lieu de 4)
