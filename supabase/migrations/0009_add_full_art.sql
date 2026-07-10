alter table public.cards
  add column if not exists is_full_art boolean not null default false;
