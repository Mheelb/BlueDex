-- Le générateur d'articles ressortait toujours les mêmes cartes dans ses "top 5"
-- (aucune trace de ce qui avait déjà été mis en avant) et piochait toujours
-- dans les mêmes 60 premières cartes de la table `cards` (requête sans tri,
-- donc résultat quasi-stable). On ajoute de quoi tracer ce qui a déjà été
-- couvert pour que la génération suivante puisse l'éviter.
alter table public.articles
  add column if not exists featured_cards text[] not null default '{}',
  add column if not exists topic_angle text;
