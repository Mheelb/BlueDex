alter table public.cards
  add column if not exists is_overframe boolean not null default false;
