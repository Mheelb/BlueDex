# BlueDex — Spécification du projet

Site répertoriant toutes les cartes du TCG **Blue Rising**, avec vocation à évoluer plus tard vers d'autres fonctionnalités (compte utilisateur, collection perso, etc. — hors scope MVP).

## Stack technique

- **Runtime / package manager** : Bun
- **Build tool** : Vite
- **Framework** : Vue 3 (Composition API) + **TypeScript** partout
- **Style** : Tailwind CSS
- **Backend / BDD / Storage / Auth** : Supabase
  - Postgres pour les données (sets, cartes)
  - Supabase Storage pour les images scannées des cartes
  - Supabase Auth pour l'accès admin uniquement (voir plus bas)
- **Langue de l'UI** : Français uniquement pour le MVP (pas d'i18n pour l'instant)
- **Hébergement prévu** : Netlify (Vercel écarté pour raisons de valeurs personnelles). Ce choix pourra être réévalué si le site grandit.

## Accès / Auth

- Le site est **public en lecture** : n'importe quel visiteur peut consulter sets et cartes sans compte.
- Un **back-office admin** protégé par Supabase Auth (login réservé à l'admin/toi) permet de :
  - créer / éditer / supprimer des sets (collections)
  - créer / éditer / supprimer des cartes
  - uploader les images scannées vers Supabase Storage
- Pas de compte visiteur pour le MVP (pourra être ajouté plus tard pour favoris/collection perso).

## Modèle de données (première approche)

### `sets` (collections)
- `id`
- `name`
- `slug` (pour les URLs)
- `release_date`
- `logo_url` / `symbol_url` (optionnel, à voir selon assets disponibles)
- `card_count` (nombre total de cartes du set, utile pour affichage "x/total")

### `cards`
- `id`
- `set_id` (FK vers `sets`)
- `number` (numéro dans le set, ex: "045")
- `name`
- `image_url` (image scannée, stockée dans Supabase Storage)
- `rarity` (raretés à lister précisément lors du seed des données réelles du jeu ; un champ ou une table `rarities` avec un flag `is_holo` déterminera l'affichage de l'effet holographique)
- `type` (type de la carte)
- `subtype` (sous-type)
- `faction` (faction)
- `cost` (coût)
- `power` (puissance)
- `support` (texte/valeur de soutien)
- champs additionnels à affiner une fois les vraies données de cartes en main (texte de carte, illustrateur, etc. si besoin)

> Note : la liste exacte des raretés et leur mapping vers "effet holographique" reste à définir précisément avec les vraies données du jeu (peut être fait au moment du seed / de la création du back-office).

## Fonctionnalités MVP

### 1. Liste des sets
- Affichage de tous les sets (collections) disponibles.

### 2. Page d'un set
- Affiche toutes les cartes du set sous forme de grille.
- Cartes **filtrables** (par rareté, type, sous-type, faction au minimum) et **triables** (par numéro, nom, rareté...).
- Chaque carte affiche : image scannée + nom + numéro en dessous.

### 3. Interactions sur la grille de cartes
- **Hover** : la carte s'agrandit légèrement.
- **Effet tilt** : légère inclinaison 3D de la carte qui suit le mouvement de la souris (effet type "carte à collectionner").
- **Effet holographique** : appliqué uniquement sur les cartes dont la rareté est marquée comme "holo", en plus du tilt.
- **Clic** : redirige vers la page de détail de la carte.

### 4. Page détail d'une carte
- Affiche toutes les informations de la carte (image en grand, nom, numéro, rareté, type, sous-type, faction, coût, puissance, soutien, set d'appartenance, etc.).

### 5. Back-office admin
- Accès protégé (Supabase Auth).
- CRUD sets et cartes.
- Upload des images scannées vers Supabase Storage.

## Hors scope pour le MVP (pistes futures)
- Comptes visiteurs, favoris, collection personnelle.
- Multilingue (i18n).
- Recherche globale multi-sets.
- Décks / deckbuilder.

## Points à clarifier avant/pendant l'implémentation
- Liste exacte et complète des raretés du jeu Blue Rising, et lesquelles ont un effet holographique.
- Format exact des données disponibles (scans + métadonnées) : à fournir par l'utilisateur pour amorcer le seed des premiers sets.
- Valeurs possibles pour `type`, `subtype`, `faction` (pour construire les filtres).
