-- L'image scannée n'est plus obligatoire à la création d'une carte.
alter table public.cards
  alter column image_url drop not null;
