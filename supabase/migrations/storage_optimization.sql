-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Cleexe Storage Optimization — unified bucket + expiry + per-user limits
-- Goal: keep total storage < 5-10 GB with 10k+ active users
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. BUCKETS — create via Supabase Dashboard or `supabase storage create`
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- BUCKET: cleexe-permanent
--   Public: true
--   File size limit: 5 MB
--   Allowed MIME: image/jpeg, image/png, image/webp, image/gif
--   Purpose: profile photos, achievement badges, logos
--   Auto-delete: NEVER
--
-- BUCKET: cleexe-temporary
--   Public: false (use signed URLs)
--   File size limit: 30 MB
--   Allowed MIME: video/mp4, video/quicktime, audio/mpeg, audio/mp4, image/jpeg, image/png
--   Purpose: video intros, circle videos, voice notes, ask-question videos, reflections
--   Auto-delete: via storage-cleanup Edge Function


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. CENTRAL FILE TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.tracked_files (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  bucket      text not null check (bucket in ('cleexe-permanent', 'cleexe-temporary')),
  file_path   text not null,
  file_type   text not null check (file_type in (
    'profile_photo', 'achievement_badge',
    'video_intro', 'circle_video', 'ask_video', 'voice_note', 'reflection_media'
  )),
  size_bytes  bigint not null default 0,
  expires_at  timestamptz,   -- null = permanent, set = auto-delete after this time
  created_at  timestamptz not null default now(),

  unique (bucket, file_path)
);

create index if not exists idx_tracked_files_user
  on public.tracked_files (user_id);

create index if not exists idx_tracked_files_expiry
  on public.tracked_files (expires_at)
  where expires_at is not null;

create index if not exists idx_tracked_files_bucket_type
  on public.tracked_files (bucket, file_type);

alter table public.tracked_files enable row level security;

create policy "Users can read own files"
  on public.tracked_files for select
  using (auth.uid() = user_id);

create policy "Users can insert own files"
  on public.tracked_files for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own files"
  on public.tracked_files for delete
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. STORAGE USAGE TRACKING ON PROFILES
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists storage_used_bytes  bigint not null default 0,
  add column if not exists storage_limit_bytes bigint not null default 524288000;
  -- 500 MB default (free tier); premium = 2 GB (2147483648)


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. ADD expires_at TO EXISTING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ask_questions: 24h expiry by default
alter table public.ask_questions
  add column if not exists file_path   text,
  add column if not exists expires_at  timestamptz;

-- Default: new ask_questions expire 24h after creation
-- Applied at insert time in app code, not as DB default (flexibility)

create index if not exists idx_ask_questions_expiry
  on public.ask_questions (expires_at)
  where expires_at is not null;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. TRIGGER: AUTO-UPDATE storage_used_bytes ON INSERT/DELETE
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.update_storage_usage()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.profiles
    set storage_used_bytes = storage_used_bytes + NEW.size_bytes
    where id = NEW.user_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.profiles
    set storage_used_bytes = greatest(0, storage_used_bytes - OLD.size_bytes)
    where id = OLD.user_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_tracked_files_usage on public.tracked_files;
create trigger trg_tracked_files_usage
  after insert or delete on public.tracked_files
  for each row execute function public.update_storage_usage();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. FUNCTION: CHECK STORAGE LIMIT (called before upload)
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.check_storage_limit(
  p_user_id uuid,
  p_file_size bigint
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_used  bigint;
  v_limit bigint;
begin
  select coalesce(storage_used_bytes, 0), coalesce(storage_limit_bytes, 524288000)
  into v_used, v_limit
  from public.profiles
  where id = p_user_id;

  if not found then
    return jsonb_build_object('allowed', true, 'used', 0, 'limit', 524288000, 'remaining', 524288000);
  end if;

  return jsonb_build_object(
    'allowed', (v_used + p_file_size) <= v_limit,
    'used', v_used,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_used),
    'requested', p_file_size
  );
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. UNIFIED CLEANUP FUNCTION (called by Edge Function or pg_cron)
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.cleanup_expired_files()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_deleted_count int := 0;
  v_file record;
begin
  for v_file in
    select id, user_id, bucket, file_path, size_bytes, file_type
    from public.tracked_files
    where expires_at is not null
      and expires_at < now()
  loop
    delete from public.tracked_files where id = v_file.id;
    v_deleted_count := v_deleted_count + 1;
  end loop;

  -- Also clean ask_questions with expired files
  delete from public.ask_questions
  where expires_at is not null
    and expires_at < now();

  -- Clean profiles with expired video intros (30-day)
  update public.profiles
  set video_intro_url = null, video_intro_at = null
  where video_intro_at < now() - interval '30 days'
    and video_intro_url is not null;

  return jsonb_build_object(
    'deleted_tracked_files', v_deleted_count,
    'timestamp', now()
  );
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. FUNCTION: DELETE USER FILES (on profile/account deletion)
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.delete_user_files(p_user_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.tracked_files where user_id = p_user_id;

  delete from public.tracked_files where user_id = p_user_id;

  update public.profiles
  set storage_used_bytes = 0
  where id = p_user_id;

  return v_count;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. STORAGE RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- cleexe-permanent: users upload to their own folder, public read
-- create policy "permanent_upload_own"
--   on storage.objects for insert
--   with check (bucket_id = 'cleexe-permanent' and (storage.foldername(name))[1] = auth.uid()::text);
--
-- create policy "permanent_read_all"
--   on storage.objects for select
--   using (bucket_id = 'cleexe-permanent');
--
-- create policy "permanent_delete_own"
--   on storage.objects for delete
--   using (bucket_id = 'cleexe-permanent' and (storage.foldername(name))[1] = auth.uid()::text);

-- cleexe-temporary: users upload to their own folder, read own or via signed URL
-- create policy "temporary_upload_own"
--   on storage.objects for insert
--   with check (bucket_id = 'cleexe-temporary' and (storage.foldername(name))[1] = auth.uid()::text);
--
-- create policy "temporary_read_own"
--   on storage.objects for select
--   using (bucket_id = 'cleexe-temporary' and (storage.foldername(name))[1] = auth.uid()::text);
--
-- create policy "temporary_delete_own"
--   on storage.objects for delete
--   using (bucket_id = 'cleexe-temporary' and (storage.foldername(name))[1] = auth.uid()::text);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. EXPIRY PRESETS (reference — used by app code)
-- ═══════════════════════════════════════════════════════════════════════════════
--
--   file_type          | bucket             | default_expiry
--   -------------------|--------------------|----------------
--   profile_photo      | cleexe-permanent   | never
--   achievement_badge  | cleexe-permanent   | never
--   video_intro        | cleexe-temporary   | 30 days
--   circle_video       | cleexe-temporary   | 7 days
--   ask_video          | cleexe-temporary   | 24 hours
--   voice_note         | cleexe-temporary   | 7 days
--   reflection_media   | cleexe-temporary   | 3 days
--
-- Schedule: select cron.schedule('storage-cleanup', '0 */4 * * *', 'select public.cleanup_expired_files()');
