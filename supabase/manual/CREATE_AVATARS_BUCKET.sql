-- =============================================================================
-- Fix "Bucket not found" for profile photos — run in Supabase → SQL Editor
-- =============================================================================

-- 1) Create public bucket (id must match app: default name "avatars")
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Policies (idempotent)
drop policy if exists "avatar_upload" on storage.objects;
drop policy if exists "avatar_read" on storage.objects;
drop policy if exists "avatar_update" on storage.objects;

create policy "avatar_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
  );

create policy "avatar_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Only the signed-in user can update files in their folder: avatars/{userId}/...
create policy "avatar_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Optional: allow users to delete their own files (replace avatars)
drop policy if exists "avatar_delete" on storage.objects;
create policy "avatar_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
