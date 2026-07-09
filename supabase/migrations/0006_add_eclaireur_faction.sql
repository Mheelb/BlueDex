-- Ajoute "Éclaireur" comme faction officielle (jusque là remappée en Émissaire à l'import).
alter table public.cards drop constraint if exists cards_faction_check;
alter table public.cards
  add constraint cards_faction_check check (
    faction is null or faction in ('Émissaire', 'Veilleur', 'Gardien', 'Éclaireur')
  );

-- Recorrige la carte importée par erreur avec Émissaire à la place d'Éclaireur.
update public.cards set faction = 'Éclaireur' where name = 'Reapered & Zeph';
