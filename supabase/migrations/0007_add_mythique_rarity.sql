-- Ajoute la rareté "Mythique".
alter table public.cards drop constraint if exists cards_rarity_check;
alter table public.cards
  add constraint cards_rarity_check check (
    rarity in ('Commune', 'Peu commune', 'Rare', 'Prestige III', 'Prestige II', 'Prestige I', 'Mythique')
  );
