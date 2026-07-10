-- Bookmarks de decks + FK decks.user_id -> profiles pour permettre à
-- PostgREST d'embarquer l'auteur (decks.user_id référence déjà auth.users,
-- mais PostgREST a besoin d'une relation directe vers la table qu'on veut
-- embarquer). profiles.id mirror 1:1 auth.users.id via le trigger
-- handle_new_user (0012_visitor_profiles.sql), donc toujours résolu.
alter table public.decks
  add constraint decks_user_id_profiles_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Table: deck_bookmarks
-- ---------------------------------------------------------------------------
create table if not exists public.deck_bookmarks (
  deck_id    uuid not null references public.decks (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (deck_id, user_id)
);

alter table public.deck_bookmarks enable row level security;

-- Personne d'autre n'a besoin de voir qui a bookmarké quoi (contrairement
-- aux étoiles, ce n'est pas un signal de popularité public).
create policy "Owner access on deck_bookmarks"
  on public.deck_bookmarks for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.decks d
      where d.id = deck_bookmarks.deck_id and (d.is_public = true or d.user_id = auth.uid())
    )
  );
