-- Ajoute les attributs "signature" et "numéroté" (+ nombre d'exemplaires) sur les cartes.
alter table public.cards
  add column if not exists is_signed boolean not null default false,
  add column if not exists is_numbered boolean not null default false,
  add column if not exists numbered_total integer;

alter table public.cards
  add constraint cards_numbered_total_check check (
    (is_numbered = false and numbered_total is null) or (is_numbered = true and numbered_total > 0)
  );
