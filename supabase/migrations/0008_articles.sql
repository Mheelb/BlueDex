-- Table "articles" pour le contenu généré (brouillon -> publication manuelle).
create table if not exists public.articles (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text not null,
  content         text not null,
  cover_image_url text,
  status          text not null default 'draft',
  created_at      timestamptz not null default now(),
  published_at    timestamptz,

  constraint articles_status_check check (status in ('draft', 'published'))
);

create index if not exists articles_status_idx on public.articles (status);

alter table public.articles enable row level security;

create policy "Public read access on published articles"
  on public.articles for select
  using (status = 'published');

create policy "Authenticated read access on all articles"
  on public.articles for select
  using (auth.role() = 'authenticated');

create policy "Authenticated write access on articles"
  on public.articles for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
