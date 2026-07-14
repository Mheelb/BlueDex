-- Storage: bucket pour les images de couverture des articles, uploadées
-- directement depuis l'admin (jusqu'ici, seule une URL externe pouvait être
-- renseignée). Mêmes règles que card-images : lecture publique, écriture
-- réservée aux admins.
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

create policy "Public read access on article-images"
  on storage.objects for select
  using (bucket_id = 'article-images');

create policy "Admin write access on article-images"
  on storage.objects for all
  using (bucket_id = 'article-images' and public.is_admin())
  with check (bucket_id = 'article-images' and public.is_admin());
