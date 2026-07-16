-- Suivi des prix — annonces Vinted déjà appariées à une carte précise, pour
-- afficher une courbe de prix sur la page de détail d'une carte.
--
-- Une ligne = une annonce Vinted connue. Le scraper (scripts/scrape-vinted.mjs,
-- exécuté en tâche planifiée GitHub Actions) upsert sur (source, external_id) :
-- une annonce revue lors d'un scrape ultérieur met juste à jour son prix et sa
-- date de scrape au lieu de se dupliquer.
--
-- v1 : on ne conserve QUE les annonces dont le score d'appariement dépasse le
-- seuil de confiance appliqué côté script — pas de file de relecture manuelle
-- pour les appariements incertains, ils sont simplement ignorés. Le seuil vit
-- dans scripts/lib/matchCard.mjs, pas ici, pour rester ajustable sans migration.

-- ---------------------------------------------------------------------------
-- Table: price_listings
-- ---------------------------------------------------------------------------
create table if not exists public.price_listings (
  id               uuid primary key default gen_random_uuid(),
  card_id          uuid not null references public.cards (id) on delete cascade,
  source           text not null default 'vinted',
  external_id      text not null,
  title            text not null,
  price_amount     numeric(10, 2) not null,
  price_currency   text not null default 'EUR',
  listing_url      text not null,
  photo_url        text,
  match_confidence numeric(4, 3) not null,
  scraped_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),

  unique (source, external_id),

  constraint price_listings_source_check check (source in ('vinted')),
  constraint price_listings_price_amount_check check (price_amount >= 0),
  constraint price_listings_confidence_check check (match_confidence >= 0 and match_confidence <= 1)
);

create index if not exists price_listings_card_id_idx on public.price_listings (card_id);
create index if not exists price_listings_card_id_scraped_at_idx on public.price_listings (card_id, scraped_at);

alter table public.price_listings enable row level security;

create policy "Public read access on price_listings"
  on public.price_listings for select
  using (true);

-- Pas de policy d'écriture : seule une clé service_role (qui contourne la RLS),
-- utilisée uniquement par scripts/scrape-vinted.mjs en tâche planifiée, peut
-- écrire dans cette table.
