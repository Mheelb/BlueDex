-- Suivi de prix jour par jour — instantané quotidien agrégé par carte.
--
-- Problème résolu : price_listings (migration 0021) stocke UN état courant par
-- annonce, upserté sur (source, external_id). Une annonce revue un autre jour
-- ne crée pas de nouvelle ligne et son scraped_at reste figé au premier jour vu.
-- Résultat : impossible de tracer une courbe jour par jour — les annonces
-- restent scotchées à leur date de première apparition.
--
-- Cette table sépare la série temporelle de l'état courant : le scraper
-- (scripts/scrape-vinted.mjs) écrit, à CHAQUE run quotidien, une ligne par carte
-- résumant les annonces actives ce jour-là (médiane, min, max, nombre). Les
-- annonces toujours en ligne réapparaissent naturellement chaque jour — on
-- enregistre donc de la vraie donnée quotidienne, sans dupliquer les annonces
-- ni fabriquer de faux points.

-- ---------------------------------------------------------------------------
-- Table: price_daily_snapshots
-- ---------------------------------------------------------------------------
create table if not exists public.price_daily_snapshots (
  id             uuid primary key default gen_random_uuid(),
  card_id        uuid not null references public.cards (id) on delete cascade,
  snapshot_date  date not null,
  median_price   numeric(10, 2) not null,
  min_price      numeric(10, 2) not null,
  max_price      numeric(10, 2) not null,
  listing_count  integer not null,
  currency       text not null default 'EUR',
  created_at     timestamptz not null default now(),

  -- Un seul snapshot par carte et par jour : un second run le même jour écrase
  -- le précédent (le scraper upsert sur ce couple).
  unique (card_id, snapshot_date),

  constraint price_daily_snapshots_price_check check (median_price >= 0 and min_price >= 0 and max_price >= 0),
  constraint price_daily_snapshots_count_check check (listing_count > 0)
);

create index if not exists price_daily_snapshots_card_id_date_idx
  on public.price_daily_snapshots (card_id, snapshot_date);

alter table public.price_daily_snapshots enable row level security;

create policy "Public read access on price_daily_snapshots"
  on public.price_daily_snapshots for select
  using (true);

-- Pas de policy d'écriture : seule la clé service_role (qui contourne la RLS),
-- utilisée par scripts/scrape-vinted.mjs, écrit dans cette table.

-- ---------------------------------------------------------------------------
-- Backfill : reconstruit les snapshots passés à partir des price_listings déjà
-- collectés, groupés par carte et par jour de scrape (fuseau Europe/Paris, pour
-- rester cohérent avec la date calculée côté scraper). Ne recouvre pas d'éventuels
-- snapshots déjà présents.
-- ---------------------------------------------------------------------------
insert into public.price_daily_snapshots
  (card_id, snapshot_date, median_price, min_price, max_price, listing_count, currency)
select
  card_id,
  (scraped_at at time zone 'Europe/Paris')::date as snapshot_date,
  round(percentile_cont(0.5) within group (order by price_amount)::numeric, 2) as median_price,
  min(price_amount) as min_price,
  max(price_amount) as max_price,
  count(*) as listing_count,
  max(price_currency) as currency
from public.price_listings
group by card_id, (scraped_at at time zone 'Europe/Paris')::date
on conflict (card_id, snapshot_date) do nothing;
