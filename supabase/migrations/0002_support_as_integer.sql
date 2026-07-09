-- "Soutien" devient une statistique numérique (comme coût/puissance) pour permettre le filtre par plage.
alter table public.cards
  alter column support type integer using nullif(support, '')::integer;
