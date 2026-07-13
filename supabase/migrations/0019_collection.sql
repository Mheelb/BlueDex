-- Collection personnelle — cartes possédées par un visiteur connecté, avec
-- quantité. Table strictement privée (contrairement aux decks) : personne
-- d'autre que le propriétaire n'a de raison de lire ou écrire ces lignes,
-- il n'y a pas de notion de partage public pour la collection.
--
-- Comme deck_cards, on ne stocke jamais quantity = 0 : "ne plus posséder"
-- une carte se traduit par la suppression de la ligne.

-- ---------------------------------------------------------------------------
-- Table: collection_cards
-- ---------------------------------------------------------------------------
create table if not exists public.collection_cards (
  user_id    uuid not null references auth.users (id) on delete cascade,
  card_id    uuid not null references public.cards (id) on delete cascade,
  quantity   integer not null default 1,
  created_at timestamptz not null default now(),

  primary key (user_id, card_id),
  constraint collection_cards_quantity_check check (quantity > 0)
);

alter table public.collection_cards enable row level security;

create policy "Owner access on collection_cards"
  on public.collection_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
