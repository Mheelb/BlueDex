-- Verrouille rarity/type/subtype/faction aux valeurs canoniques au niveau de la base,
-- pour que ce ne soit pas uniquement le <select> de l'admin qui empêche les valeurs invalides.

-- Normalise quelques variantes sans accent qui ont pu être saisies avant ce verrou.
update public.cards set faction = 'Émissaire' where faction = 'Emissaire';
update public.cards set type = 'Événement' where type = 'Evenement';
update public.cards set type = 'Piège' where type = 'Piege';
update public.cards set subtype = 'Héros' where subtype = 'Heros';
update public.cards set subtype = 'Légende' where subtype = 'Legende';

-- Si cette migration échoue avec "violates check constraint", c'est qu'il reste des
-- valeurs invalides en base : corrige-les (via le Table Editor ou une requête UPDATE)
-- puis relance la migration.
alter table public.cards
  add constraint cards_rarity_check check (
    rarity in ('Commune', 'Peu commune', 'Rare', 'Prestige III', 'Prestige II', 'Prestige I')
  ),
  add constraint cards_type_check check (
    type is null or type in ('Personnage', 'Événement', 'Objet', 'Piège', 'Artefact', 'Environnement')
  ),
  add constraint cards_subtype_check check (
    subtype is null or subtype in ('Héros', 'Légende', 'Aspirant')
  ),
  add constraint cards_faction_check check (
    faction is null or faction in ('Émissaire', 'Veilleur', 'Gardien')
  );
