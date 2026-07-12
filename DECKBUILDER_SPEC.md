# BlueDex — Spécification : Deck Builder

## 1. Contexte

Le deckbuilder permet à un joueur de construire, sauvegarder et partager des decks légaux pour le TCG **Blue Rising**, à partir des cartes déjà répertoriées dans BlueDex (`sets` / `cards`).

Contrairement au reste du site (100% public, lecture seule, pas de compte visiteur), le deckbuilder introduit :

- un **compte visiteur** (au-delà de l'admin actuel),
- de la **donnée écrite par des utilisateurs non-admin** (leurs decks),
- une notion de **contenu public généré par les utilisateurs** (decks partagés).

## 2. Règles du jeu pertinentes pour la construction

_(Résumé extrait des règles complètes de Blue Rising, cf. échange du 2026-07-10 — à conserver comme source de vérité pour la validation.)_

### Types de cartes impliqués

- **Personnage** (dont sous-types `Héros`, `Légende`, `Aspirant`). Les **Écuyers** sont des **jetons** générés en partie (pas des cartes que l'on met dans un deck) : ils ne rentrent pas dans le decklist ni dans le modèle `cards`, donc **hors scope deckbuilder**.
- **Objet** — s'équipe sur un personnage.
- **Événement** — one-shot.
- **Piège** — posé face cachée.
- **Artefact** — un par joueur, cond. de révélation.
- **Environnement** — un par joueur, représente la "base".

### Formats de construction

Blue Rising définit deux formats, avec des règles de deck différentes :

| Règle                     | Format **Normal**    | Format **Rapide**    |
| ------------------------- | -------------------- | -------------------- |
| Taille du deck            | Exactement 42 cartes | Exactement 31 cartes |
| Exemplaires max par carte | 3                    | 2                    |
| `Environnement`           | Exactement 1         | Exactement 1         |
| `Artefact`                | Exactement 1         | Interdit (0)         |
| `Aspirant` différents     | Au moins 4           | Au moins 3           |

Points à noter pour la logique de validation :

- La limite d'exemplaires (3 ou 2) s'applique **par nom de carte** (`card.name`), toutes éditions/illustrations confondues — pas par `card.id`. Donc deux versions différentes (ex: normale + full art) de "Kameto" comptent ensemble dans le total de 3 (ou 2), pas séparément.
  > ⚠️ Point de vigilance futur : si une carte du même nom ressort un jour avec un effet différent (reprint non-identique), ce regroupement par nom ne sera plus correct. Pas un problème pour l'instant vu les données existantes, mais à garder en tête si ça arrive.
- "Au moins N Aspirants différents" est une contrainte de **diversité** (nombre de cartes distinctes de sous-type `Aspirant`), pas une quantité totale.
- Il n'y a **aucune contrainte de faction** ni de format légal/rotation (tous les sets publiés sont utilisables, pas de liste de bannissement pour la V1).
- Pas de mécanique de "leader" distincte : Héros/Légende sont des personnages comme les autres dans le deck principal, juste avec un scoring différent en jeu (hors-scope deckbuilder).

## 3. Utilisateurs & Auth

- Ajout d'un système de **compte visiteur** via Supabase Auth, **email + mot de passe**.
- Scope volontairement restreint (pas de collection perso de cartes possédées). Le seul enrichissement au-delà de l'email est un **pseudo** (obligatoire) et un **avatar** (optionnel), demandés à l'inscription — nécessaires pour identifier l'auteur d'un deck public en galerie (cf. §5.5).
- Un visiteur non connecté peut :
  - parcourir le site normalement (déjà le cas),
  - consulter la **galerie de decks publics** et un deck public via son lien direct,
  - **mais pas** construire/sauvegarder de deck (redirection vers connexion/inscription).
- Un visiteur connecté peut : créer/éditer/dupliquer/supprimer ses propres decks, basculer un deck en public/privé, générer/consulter son lien de partage.

## 4. Modèle de données (proposition)

### `profiles`

- `id` (uuid, FK → `auth.users`, PK)
- `display_name` (text, pseudo choisi à l'inscription)
- `avatar_url` (text, image uploadée vers un bucket Storage dédié, ex: `avatars`)
- `created_at`

> Nécessaire même avec un scope restreint : la galerie de decks publics doit afficher un auteur sans exposer d'email, et `auth.users` n'est pas interrogeable côté client via RLS. Rempli à l'inscription (pseudo + upload avatar), éditable plus tard depuis un écran "Mon compte" minimal.

### `deck_stars`

- `deck_id` (FK → `decks`, cascade delete)
- `user_id` (FK → `auth.users`, cascade delete)
- `created_at`
- clé primaire composite (`deck_id`, `user_id`) — un joueur ne peut mettre qu'une seule étoile par deck (togglable, il peut la retirer).
- `decks.star_count` (integer, défaut 0) : compteur dénormalisé maintenu par trigger sur insert/delete de `deck_stars`, pour permettre un tri efficace par popularité dans la galerie sans agrégation à la volée.

### `deck_bookmarks`

- `deck_id` (FK → `decks`, cascade delete)
- `user_id` (FK → `auth.users`, cascade delete)
- `created_at`
- clé primaire composite (`deck_id`, `user_id`).
- Distinct des `deck_stars` : c'est un **rangement personnel** ("decks sauvegardés"), pas un signal de popularité public. Pas de compteur dénormalisé, pas d'affichage public d'un total.

### `decks`

- `id` (uuid)
- `user_id` (FK → `auth.users`)
- `name` (text)
- `format` (`'normal' | 'rapide'`)
- `is_public` (boolean, défaut `false`)
- `star_count` (integer, défaut 0, cf. `deck_stars` ci-dessous)
- `created_at`, `updated_at`

### `deck_cards`

- `deck_id` (FK → `decks`, cascade delete)
- `card_id` (FK → `cards`)
- `quantity` (integer)
- clé primaire composite (`deck_id`, `card_id`)

### RLS (Row Level Security)

- `profiles` : lecture publique (nécessaire pour afficher pseudo/avatar en galerie) ; écriture réservée à `auth.uid() = id`.
- `decks` / `deck_cards` : lecture publique si `decks.is_public = true` ; sinon lecture/écriture réservée à `auth.uid() = decks.user_id`.
- `deck_stars` : lecture publique (pour afficher le compteur) ; écriture réservée aux utilisateurs connectés, uniquement `auth.uid() = user_id`, uniquement sur des decks publics (`decks.is_public = true`), et **jamais sur son propre deck** (`decks.user_id != auth.uid()`).
- `deck_bookmarks` : lecture/écriture réservées à `auth.uid() = user_id` (personne d'autre n'a besoin de voir qui a bookmarké quoi). Un utilisateur peut bookmarker n'importe quel deck qu'il peut déjà voir (ses propres decks, ou un deck public d'autrui) — pas de restriction d'auto-bookmark, contrairement aux étoiles, puisque ce n'est pas un signal de popularité.

## 5. Fonctionnalités

### 5.1 Mes decks (liste)

- Page listant les decks du joueur connecté : nom, format, nombre de cartes, statut légal (✅/⚠️), public/privé.
- Actions : créer, dupliquer, renommer, supprimer, ouvrir dans l'éditeur.
- Un joueur peut aussi **dupliquer le deck public d'un autre joueur** (bouton "Copier ce deck" depuis la vue lecture seule, cf. §5.5) : ça crée une copie dans "Mes decks", éditable, indépendante de l'original.

### 5.2 Éditeur de deck (écran principal)

Layout **deux colonnes** :

- **Catalogue de cartes** (gauche/centre) : réutilise les filtres existants (rareté, type, sous-type, faction, coût, puissance, soutien, recherche par nom) + filtre par set. Ajout au deck par **clic** ou **drag & drop**.
- **Panneau deck** (droite) : affichage en **grille de miniatures** des cartes du deck (avec quantité en badge sur chaque carte), nom du deck, sélecteur de format (Normal/Rapide), compteur `X/42` ou `X/31`.

Sélection du format : modifiable à tout moment ; un changement de format **re-valide immédiatement** le deck avec les nouvelles règles (peut faire passer un deck valide à invalide).

### 5.3 Validation de légalité — **bloquante**

- Impossible d'ajouter une carte qui violerait une règle immédiate (ex: 4e exemplaire alors que la limite est 3 → carte non-ajoutable/bouton désactivé avec tooltip expliquant pourquoi).
- Les règles qui ne se vérifient qu'à l'échelle du deck complet (taille exacte, ≥N Aspirants différents, exactement 1 Environnement/Artefact) sont affichées en continu comme une checklist de validité (ex: "38/42 cartes", "3/4 Aspirants différents — manque 1", "Environnement : ✅", "Artefact : ✅").
- Un deck peut être sauvegardé même incomplet/invalide (mode brouillon), mais son statut (valide/invalide) est visible partout où il apparaît (liste "Mes decks", partage).

### 5.4 Statistiques du deck

- Courbe de coût (histogramme nombre de cartes par valeur de `cost`).
- Répartition par type / sous-type.

### 5.5 Partage

- Toggle public/privé par deck.
- Deck privé : invisible à quiconque n'est pas le propriétaire (même avec le lien).
- Deck public : accessible en lecture seule via lien direct **et** listé dans une **galerie publique de decks**.
- Vue "lecture seule" d'un deck public : liste/grille des cartes, stats, auteur (pseudo + avatar), un bouton **"Copier ce deck"** (si connecté), un bouton **étoile** (⭐ bleue) pour "star" le deck, et un bouton **bookmark** (🔖) pour le sauvegarder dans ses decks bookmarkés.

### 5.6 Étoiles (upvotes)

- Un utilisateur connecté peut mettre une étoile bleue sur un deck public (togglable — une seule étoile par joueur et par deck, retirable).
- Un joueur ne peut pas s'auto-étoiler son propre deck (cf. §8) — bouton masqué/désactivé sur ses propres decks.
- Le nombre d'étoiles est affiché sur la carte du deck en galerie et sur sa vue détaillée.
- **Rate limiting côté client via [TanStack Pacer](https://tanstack.com/pacer)** : le toggle étoile est throttle/debounce pour empêcher le spam de clics (double-clic nerveux, spam volontaire) qui enverrait une rafale de requêtes insert/delete sur `deck_stars`. Nouvelle dépendance à ajouter (`@tanstack/pacer` ou équivalent Vue). Le rate limit serveur (RLS/policy) reste la garantie ultime — le client-side throttling n'est qu'un confort UX/anti-spam, pas la protection de sécurité.

### 5.7 Bookmarks (decks sauvegardés)

- Distinct des étoiles : un **bookmark** sert à retrouver facilement un deck (le sien ou celui d'un autre joueur), sans porter de signification de "vote"/popularité. On appelle volontairement ça "bookmark" et pas "favori" pour éviter la confusion avec l'étoile.
- Icône dédiée (🔖, différente de l'étoile ⭐), sur la vue détaillée d'un deck (et sur les cartes de la galerie).
- Page **"Decks sauvegardés"** listant tous les decks bookmarkés par l'utilisateur connecté (mélange potentiel de ses propres decks et de decks publics d'autrui), distincte de la page "Mes decks" (§5.1, qui liste uniquement les decks dont on est propriétaire).
- Pas de restriction d'auto-bookmark (contrairement aux étoiles) : bookmarker son propre deck est autorisé, même si redondant avec "Mes decks".

### 5.8 Galerie publique de decks

- Recherche par nom de deck.
- Filtre par format (Normal / Rapide).
- Tri : plus récents d'abord (défaut), ou par nombre d'étoiles (plus populaires d'abord).

### 5.9 Export

- Bouton "Copier la liste" → texte simple `quantité x Nom de carte`, groupé par type, copiable dans le presse-papier (utile pour Discord/forum).

## 6. Routes envisagées

- `/deckbuilder` ou `/decks` — liste "Mes decks" (nécessite connexion) + CTA connexion si non connecté.
- `/deckbuilder/:deckId` — éditeur d'un deck (propriétaire uniquement).
- `/decks/bookmarks` — liste des decks sauvegardés (bookmarkés) par l'utilisateur connecté.
- `/decks/galerie` — galerie des decks publics.
- `/decks/:deckId` (ou slug partageable dédié) — vue lecture seule d'un deck public.
- `/login`, `/signup` — auth visiteur (distincte de `/admin/login`).

## 7. Hors scope pour cette V1

- Collection personnelle de cartes possédées (différent des decks/bookmarks).
- Rotation de sets / liste de bannissement / formats compétitifs officiels.
- Commentaires sur les decks publics (seules les étoiles sont prévues, pas de commentaires texte).
- Import de deck (autre que la construction manuelle) — pas de "deck code" décidé pour l'instant (le partage se fait par lien, pas par code texte réimportable).
- Simulateur de partie / mode test.

## 8. Décisions prises dans cette itération

- **Confirmation email à l'inscription : désactivée.** Compte actif immédiatement après inscription (pseudo + avatar renseignés dans la foulée). Simple toggle Supabase, réversible sans code si besoin de durcir plus tard (spam, faux comptes...).
- **Galerie publique** : recherche par nom de deck, filtre par format, tri par date (défaut) ou par nombre d'étoiles.
- **Auto-étoilage : interdit.** Un joueur ne peut pas étoiler son propre deck (bouton masqué/désactivé sur ses propres decks) — le compteur reste un signal de popularité venant d'autres joueurs.

## 9. Points ouverts restants

Aucun pour l'instant — tous les points soulevés ont été tranchés. À réévaluer si de nouvelles questions émergent en avançant sur le sujet.
