-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Cleexe Video Intros — schema additions for profiles + storage + cleanup
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Add video intro columns to profiles table
alter table public.profiles
  add column if not exists video_intro_url  text,
  add column if not exists video_intro_at   timestamptz;

-- Index for queries that filter by users who have video intros
create index if not exists idx_profiles_has_video
  on public.profiles (video_intro_url)
  where video_intro_url is not null;


-- 2. Storage bucket for video intros
-- Run in Supabase dashboard > Storage > Create bucket:
--   Name: video-intros
--   Public: true (so match cards can load thumbnails)
--   File size limit: 30MB
--   Allowed MIME types: video/mp4, video/quicktime


-- 3. Storage RLS policies (run in SQL editor)
-- Users can upload their own intro video
-- create policy "Users upload own video intro"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'video-intros'
--     and (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Users can update (re-record) their own intro video
-- create policy "Users update own video intro"
--   on storage.objects for update
--   using (
--     bucket_id = 'video-intros'
--     and (storage.foldername(name))[1] = auth.uid()::text
--   );

-- Anyone can read video intros (for matching cards)
-- create policy "Video intros are publicly readable"
--   on storage.objects for select
--   using (bucket_id = 'video-intros');

-- Users can delete their own videos
-- create policy "Users delete own video intro"
--   on storage.objects for delete
--   using (
--     bucket_id = 'video-intros'
--     and (storage.foldername(name))[1] = auth.uid()::text
--   );


-- 4. Cleanup function for expired video intros (30-day retention)
create or replace function public.cleanup_old_video_intros()
returns void
language plpgsql
security definer
as $$
declare
  expired_row record;
begin
  for expired_row in
    select id, video_intro_url
    from public.profiles
    where video_intro_at < now() - interval '30 days'
      and video_intro_url is not null
  loop
    update public.profiles
    set video_intro_url = null, video_intro_at = null
    where id = expired_row.id;
  end loop;
end;
$$;

-- Schedule with pg_cron (if available):
-- select cron.schedule('cleanup-video-intros', '0 3 * * *', 'select public.cleanup_old_video_intros()');
