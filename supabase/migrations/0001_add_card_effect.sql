-- Ajoute le texte d'effet de la carte.
alter table public.cards
  add column if not exists effect text;
