-- La liste des decks affichait une icône générique + une couleur codée en dur
-- par format faute de mieux : on laisse le créateur choisir une carte de son
-- deck comme vignette de couverture.
alter table public.decks
  add column if not exists cover_card_id uuid references public.cards (id) on delete set null;

drop function if exists public.save_deck(uuid, text, text, boolean, jsonb);

create or replace function public.save_deck(
  p_deck_id uuid,
  p_name text,
  p_format text,
  p_is_public boolean,
  p_cover_card_id uuid,
  p_entries jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deck_id uuid := p_deck_id;
  v_size integer;
  v_max_copies integer;
  v_env_target integer;
  v_art_target integer;
  v_min_aspirants integer;
  v_total integer;
  v_env_count integer;
  v_art_count integer;
  v_aspirant_count integer;
begin
  if p_format = 'normal' then
    v_size := 42; v_max_copies := 3; v_env_target := 1; v_art_target := 1; v_min_aspirants := 4;
  elsif p_format = 'rapide' then
    v_size := 31; v_max_copies := 2; v_env_target := 1; v_art_target := 0; v_min_aspirants := 3;
  else
    raise exception 'Format de deck invalide : %', p_format;
  end if;

  if v_deck_id is null then
    insert into public.decks (user_id, name, format, is_public, cover_card_id)
    values (auth.uid(), p_name, p_format, p_is_public, p_cover_card_id)
    returning id into v_deck_id;
  else
    update public.decks
    set name = p_name, format = p_format, is_public = p_is_public, cover_card_id = p_cover_card_id, updated_at = now()
    where id = v_deck_id and user_id = auth.uid();

    if not found then
      raise exception 'Deck introuvable ou accès refusé.';
    end if;
  end if;

  delete from public.deck_cards where deck_id = v_deck_id;

  insert into public.deck_cards (deck_id, card_id, quantity)
  select v_deck_id, (entry ->> 'card_id')::uuid, (entry ->> 'quantity')::integer
  from jsonb_array_elements(p_entries) as entry;

  select coalesce(sum(dc.quantity), 0) into v_total
  from public.deck_cards dc
  where dc.deck_id = v_deck_id;

  if v_total <> v_size then
    raise exception 'Le deck doit contenir exactement % cartes (actuellement %).', v_size, v_total;
  end if;

  if exists (
    select 1
    from public.deck_cards dc
    join public.cards c on c.id = dc.card_id
    where dc.deck_id = v_deck_id
    group by c.name, c.type
    having sum(dc.quantity) > case
      when c.type = 'Environnement' then v_env_target
      when c.type = 'Artefact' then v_art_target
      else v_max_copies
    end
  ) then
    raise exception 'Une ou plusieurs cartes dépassent le nombre d''exemplaires autorisé pour ce format.';
  end if;

  select coalesce(sum(dc.quantity), 0) into v_env_count
  from public.deck_cards dc
  join public.cards c on c.id = dc.card_id
  where dc.deck_id = v_deck_id and c.type = 'Environnement';

  if v_env_count <> v_env_target then
    raise exception 'Le deck doit contenir exactement % carte(s) Environnement (actuellement %).', v_env_target, v_env_count;
  end if;

  select coalesce(sum(dc.quantity), 0) into v_art_count
  from public.deck_cards dc
  join public.cards c on c.id = dc.card_id
  where dc.deck_id = v_deck_id and c.type = 'Artefact';

  if v_art_count <> v_art_target then
    raise exception 'Le deck doit contenir exactement % carte(s) Artefact (actuellement %).', v_art_target, v_art_count;
  end if;

  select count(distinct c.name) into v_aspirant_count
  from public.deck_cards dc
  join public.cards c on c.id = dc.card_id
  where dc.deck_id = v_deck_id and c.subtype = 'Aspirant';

  if v_aspirant_count < v_min_aspirants then
    raise exception 'Le deck doit contenir au moins % Aspirants différents (actuellement %).', v_min_aspirants, v_aspirant_count;
  end if;

  if p_cover_card_id is not null and not exists (
    select 1 from public.deck_cards dc where dc.deck_id = v_deck_id and dc.card_id = p_cover_card_id
  ) then
    raise exception 'La carte de couverture doit faire partie du deck.';
  end if;

  return v_deck_id;
end;
$$;

grant execute on function public.save_deck(uuid, text, text, boolean, uuid, jsonb) to authenticated;
