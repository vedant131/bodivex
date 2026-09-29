-- Supabase-specific wiring. On another provider replace this file only:
-- storage bucket → S3 bucket + presigned uploads, realtime → any Postgres change feed.

-- One public media bucket. Paths: users/{uid}/..., transformations/{uid}/...
-- Note: one 50MB/type limit for the bucket (the intro video needs it); images are
-- compressed by the picker. Split into photo/video buckets if abuse shows up.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 50 * 1024 * 1024, array['image/*', 'video/*'])
on conflict (id) do nothing;

create policy media_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] in ('users', 'transformations')
              and (storage.foldername(name))[2] = auth.uid()::text);
create policy media_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[2] = auth.uid()::text);
create policy media_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[2] = auth.uid()::text);
create policy media_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[2] = auth.uid()::text);

-- Live updates for the screens that subscribe (row-level security still applies).
alter publication supabase_realtime add table public.sessions, public.chats, public.messages, public.trainers;
