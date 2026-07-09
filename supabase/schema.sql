-- BlueDex — schéma initial (sets + cards)
-- À exécuter dans l'éditeur SQL de Supabase (ou via `supabase db push` plus tard).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Table: sets (collections)
-- ---------------------------------------------------------------------------
create table if not exists public.sets (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  release_date date,
  card_count   integer not null default 0,
  logo_url     text,
  symbol_url   text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Table: cards
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id         uuid primary key default gen_random_uuid(),
  set_id     uuid not null references public.sets (id) on delete cascade,
  number     text not null,
  name       text not null,
  image_url  text,
  rarity     text not null,
  is_holo    boolean not null default false,
  is_signed  boolean not null default false,
  is_numbered      boolean not null default false,
  numbered_total   integer,
  type       text,
  subtype    text,
  faction    text,
  cost       integer,
  power      integer,
  support    integer,
  effect     text,
  created_at timestamptz not null default now(),

  unique (set_id, number),

  constraint cards_numbered_total_check check (
    (is_numbered = false and numbered_total is null) or (is_numbered = true and numbered_total > 0)
  ),

  constraint cards_rarity_check check (
    rarity in ('Commune', 'Peu commune', 'Rare', 'Prestige III', 'Prestige II', 'Prestige I')
  ),
  constraint cards_type_check check (
    type is null or type in ('Personnage', 'Événement', 'Objet', 'Piège', 'Artefact', 'Environnement')
  ),
  constraint cards_subtype_check check (
    subtype is null or subtype in ('Héros', 'Légende', 'Aspirant')
  ),
  constraint cards_faction_check check (
    faction is null or faction in ('Émissaire', 'Veilleur', 'Gardien')
  )
);

create index if not exists cards_set_id_idx on public.cards (set_id);
create index if not exists cards_rarity_idx on public.cards (rarity);
create index if not exists cards_type_idx on public.cards (type);
create index if not exists cards_faction_idx on public.cards (faction);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Lecture publique pour tout le monde (site public), écriture réservée aux
-- utilisateurs authentifiés (= admin, puisque l'inscription publique doit
-- rester désactivée dans Supabase Auth > Providers).
-- ---------------------------------------------------------------------------
alter table public.sets enable row level security;
alter table public.cards enable row level security;

create policy "Public read access on sets"
  on public.sets for select
  using (true);

create policy "Authenticated write access on sets"
  on public.sets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Public read access on cards"
  on public.cards for select
  using (true);

create policy "Authenticated write access on cards"
  on public.cards for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Storage: bucket pour les images de cartes scannées
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

create policy "Public read access on card-images"
  on storage.objects for select
  using (bucket_id = 'card-images');

create policy "Authenticated write access on card-images"
  on storage.objects for all
  using (bucket_id = 'card-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'card-images' and auth.role() = 'authenticated');
