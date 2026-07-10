-- Blue Stars — le signal de popularité public des decks (decks.star_count).
--
-- Contrairement aux bookmarks (privés, cf. 0015_deck_bookmarks.sql), une
-- Blue Star est un vote public : un compte ne peut en donner qu'une par
-- deck, ne peut pas voter pour son propre deck, et ne peut voter que sur un
-- deck public. decks.star_count reste la source affichée par l'app (tri
-- "Plus populaire" inclus) ; il est tenu à jour par trigger plutôt que par
-- le client, pour rester correct même si deux votes arrivent en même temps
-- et pour ne pas avoir à faire confiance au client sur le compteur.

-- ---------------------------------------------------------------------------
-- Table: deck_stars
-- ---------------------------------------------------------------------------
create table if not exists public.deck_stars (
  deck_id    uuid not null references public.decks (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (deck_id, user_id)
);

create index if not exists deck_stars_deck_id_idx on public.deck_stars (deck_id);

alter table public.deck_stars enable row level security;

create policy "Star access on deck_stars"
  on public.deck_stars for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.decks d
      where d.id = deck_stars.deck_id and d.is_public = true and d.user_id <> auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Synchronisation de decks.star_count
-- ---------------------------------------------------------------------------
-- security definer : celui qui vote n'est presque jamais le propriétaire du
-- deck, or la policy d'écriture sur `decks` réserve les updates au
-- propriétaire. La fonction doit donc contourner RLS pour pouvoir tenir le
-- compteur à jour quel que soit qui vote.
create or replace function public.deck_stars_sync_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.decks set star_count = star_count + 1 where id = new.deck_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.decks set star_count = greatest(star_count - 1, 0) where id = old.deck_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger deck_stars_after_insert
  after insert on public.deck_stars
  for each row execute function public.deck_stars_sync_count();

create trigger deck_stars_after_delete
  after delete on public.deck_stars
  for each row execute function public.deck_stars_sync_count();
