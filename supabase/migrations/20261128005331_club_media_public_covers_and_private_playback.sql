drop policy if exists club_media_read_authorized on storage.objects;
create policy club_media_read_authorized on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'club-media'
  and (
    exists (select 1 from public.club_backstage_media m where m.thumbnail_path = name and m.status = 'published')
    or exists (select 1 from public.club_backstage_media m where m.storage_path = name and m.status = 'published' and private.can_access_backstage_media(m.id))
    or exists (
      select 1 from public.club_moment_media mm join public.club_moment_albums a on a.id = mm.album_id
      where (mm.storage_path = name or mm.thumbnail_path = name) and a.status = 'published' and private.user_has_event_access(a.event_id)
    )
    or exists (select 1 from public.club_moment_albums a where a.cover_path = name and a.status = 'published' and private.user_has_event_access(a.event_id))
    or exists (select 1 from public.club_offers o where o.cover_path = name and o.status = 'published')
  )
);