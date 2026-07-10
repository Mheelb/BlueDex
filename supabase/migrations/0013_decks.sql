-- Deckbuilder — decks et cartes de deck.
--
-- ---------------------------------------------------------------------------
-- Table: decks
-- ---------------------------------------------------------------------------
create table if not exists public.decks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  format     text not null,
  is_public  boolean not null default false,
  star_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint decks_format_check check (format in ('normal', 'rapide'))
);

create index if not exists decks_user_id_idx on public.decks (user_id);

alter table public.decks enable row level security;

create policy "Public read access on public decks"
  on public.decks for select
  using (is_public = true or auth.uid() = user_id);

create policy "Owner write access on decks"
  on public.decks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Table: deck_cards
-- ---------------------------------------------------------------------------
create table if not exists public.deck_cards (
  deck_id  uuid not null references public.decks (id) on delete cascade,
  card_id  uuid not null references public.cards (id) on delete cascade,
  quantity integer not null,

  primary key (deck_id, card_id),
  constraint deck_cards_quantity_check check (quantity > 0)
);

create index if not exists deck_cards_deck_id_idx on public.deck_cards (deck_id);

alter table public.deck_cards enable row level security;

create policy "Public read access on public deck_cards"
  on public.deck_cards for select
  using (
    exists (
      select 1 from public.decks d
      where d.id = deck_cards.deck_id and (d.is_public = true or d.user_id = auth.uid())
    )
  );

create policy "Owner write access on deck_cards"
  on public.deck_cards for all
  using (
    exists (select 1 from public.decks d where d.id = deck_cards.deck_id and d.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.decks d where d.id = deck_cards.deck_id and d.user_id = auth.uid())
  );
