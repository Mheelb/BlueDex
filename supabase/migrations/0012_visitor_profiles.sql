-- Comptes visiteurs (deckbuilder) + durcissement de la sécurité admin.
--
-- Jusqu'ici, toutes les policies d'écriture "admin" vérifiaient simplement
-- auth.role() = 'authenticated', ce qui était sûr tant que le seul compte
-- capable de s'authentifier était l'admin. On ouvre maintenant l'inscription
-- publique (deckbuilder), donc ces policies doivent distinguer "admin" de
-- "visiteur connecté" via profiles.is_admin.
--
-- ÉTAPE MANUELLE APRÈS MIGRATION : promouvoir ton compte admin existant
-- (exécuter dans le SQL editor Supabase, qui tourne hors contexte PostgREST
-- et n'est donc pas bloqué par le trigger anti-self-promotion ci-dessous) :
--   update public.profiles set is_admin = true where id = '<uuid de ton compte admin>';

-- ---------------------------------------------------------------------------
-- Table: profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public read access on profiles"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Empêche un visiteur connecté de s'auto-promouvoir admin via un update
-- PostgREST classique, sans bloquer une modification manuelle faite depuis
-- le SQL editor (où auth.role() est NULL, hors contexte de requête API).
create or replace function public.protect_profile_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.role() is not null and auth.role() <> 'service_role' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger protect_profile_is_admin
  before update on public.profiles
  for each row
  execute function public.protect_profile_is_admin();

-- Crée automatiquement le profil (pseudo + avatar optionnel fournis à
-- l'inscription via options.data) dès qu'un compte auth.users est créé.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Joueur'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Helper réutilisé par les policies "admin only" ci-dessous.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Durcissement des policies existantes : auth.role() = 'authenticated'
-- -> public.is_admin()
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated write access on sets" on public.sets;
create policy "Admin write access on sets"
  on public.sets for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated write access on cards" on public.cards;
create policy "Admin write access on cards"
  on public.cards for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated read access on all articles" on public.articles;
create policy "Admin read access on all articles"
  on public.articles for select
  using (public.is_admin());

drop policy if exists "Authenticated write access on articles" on public.articles;
create policy "Admin write access on articles"
  on public.articles for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated write access on card-images" on storage.objects;
create policy "Admin write access on card-images"
  on storage.objects for all
  using (bucket_id = 'card-images' and public.is_admin())
  with check (bucket_id = 'card-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: bucket pour les avatars visiteurs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public read access on avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Convention de chemin : {user_id}/nom-de-fichier — chacun ne peut écrire
-- que dans son propre dossier.
create policy "Owner write access on avatars"
  on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
