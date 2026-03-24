-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Cleexe Ask & Learn — table + policies + auto-cleanup
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Table
create table if not exists public.ask_questions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  text        text not null check (char_length(text) >= 10),
  is_public   boolean not null default true,
  circle_ids  text[] default '{}',
  video_url   text,
  created_at  timestamptz not null default now()
);

-- Index for feed queries
create index if not exists idx_ask_questions_public
  on public.ask_questions (is_public, created_at desc);

create index if not exists idx_ask_questions_user
  on public.ask_questions (user_id, created_at desc);

-- 2. RLS policies
alter table public.ask_questions enable row level security;

-- Anyone can read public questions
create policy "Public questions are visible to all"
  on public.ask_questions for select
  using (is_public = true);

-- Users can read private questions they posted or are in the circle
create policy "Users can read own or circle private questions"
  on public.ask_questions for select
  using (
    auth.uid() = user_id
    or (
      is_public = false
      and exists (
        select 1
        from unnest(circle_ids) as cid
        where cid = any(
          -- Replace with actual circle membership lookup
          array[auth.uid()::text]
        )
      )
    )
  );

-- Users can insert their own questions
create policy "Users can create questions"
  on public.ask_questions for insert
  with check (auth.uid() = user_id);

-- Users can delete their own questions
create policy "Users can delete own questions"
  on public.ask_questions for delete
  using (auth.uid() = user_id);


-- 3. Storage bucket for circle videos
-- Run in Supabase dashboard > Storage > Create bucket:
--   Name: ask-videos
--   Public: false
--   File size limit: 10MB
--   Allowed MIME types: video/mp4, video/quicktime


-- 4. Auto-delete function (runs via pg_cron or Supabase Edge Function)
create or replace function public.cleanup_old_ask_questions()
returns void
language plpgsql
security definer
as $$
begin
  -- Delete video files from storage (requires storage admin)
  -- This is handled by the Edge Function below for better control

  -- Delete rows older than 24 hours
  delete from public.ask_questions
  where created_at < now() - interval '24 hours';
end;
$$;

-- Schedule with pg_cron (if available on your Supabase plan):
-- select cron.schedule('cleanup-ask-questions', '0 * * * *', 'select public.cleanup_old_ask_questions()');
