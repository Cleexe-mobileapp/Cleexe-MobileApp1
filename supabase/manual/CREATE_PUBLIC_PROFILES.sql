-- =============================================================================
-- Cleexe — Create public.profiles (run in Supabase Dashboard → SQL Editor)
--
-- Use this if the app shows: "no public.profiles table" / PGRST205 schema cache.
-- Safe to run more than once (idempotent where possible).
-- =============================================================================

-- UUID generation (usually already enabled on Supabase)
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  bio text,
  avatar_url text,
  website text,
  is_premium boolean not null default false,
  is_creator boolean not null default false,
  referral_code text unique,
  streak_visibility text not null default 'public'
    check (streak_visibility in ('public', 'private')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- App expects this column (Edit Profile / category pill)
alter table public.profiles
  add column if not exists category text;

comment on table public.profiles is 'Cleexe user profiles; one row per auth user.';
comment on column public.profiles.category is 'Preset label (Athlete, Entrepreneur, …).';

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_referral_code on public.profiles(referral_code);

-- -----------------------------------------------------------------------------
-- 2. updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Auto-create profile row on signup
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, referral_code)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
    ),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;

-- Public read (for handles, avatars, follow lists, etc.)
create policy "profiles_select"
  on public.profiles for select
  using (true);

-- Users can create their own row (edge cases / repairs)
create policy "profiles_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update only their row
create policy "profiles_update"
  on public.profiles for update
  using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 5. Backfill: existing auth users → profiles
-- -----------------------------------------------------------------------------
insert into public.profiles (id, username, bio, avatar_url, category)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'username'), ''),
    'user_' || substr(replace(u.id::text, '-', ''), 1, 8)
  ),
  nullif(trim(u.raw_user_meta_data->>'bio'), ''),
  nullif(trim(u.raw_user_meta_data->>'avatar_url'), ''),
  nullif(trim(u.raw_user_meta_data->>'category'), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Merge Auth metadata into existing rows (data saved while profiles was missing)
update public.profiles p
set
  bio = case
    when (p.bio is null or trim(p.bio) = '') and nullif(trim(u.raw_user_meta_data->>'bio'), '') is not null
    then nullif(trim(u.raw_user_meta_data->>'bio'), '')
    else p.bio
  end,
  avatar_url = coalesce(p.avatar_url, nullif(trim(u.raw_user_meta_data->>'avatar_url'), '')),
  category = case
    when (p.category is null or trim(p.category) = '') and nullif(trim(u.raw_user_meta_data->>'category'), '') is not null
    then nullif(trim(u.raw_user_meta_data->>'category'), '')
    else p.category
  end,
  username = case
    when p.username ~ '^user_[a-f0-9]{8}$'
      and nullif(trim(u.raw_user_meta_data->>'username'), '') is not null
    then nullif(trim(u.raw_user_meta_data->>'username'), '')
    else p.username
  end
from auth.users u
where u.id = p.id;

-- -----------------------------------------------------------------------------
-- 6. Optional: avatars storage bucket (profile photo uploads)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

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

create policy "avatar_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- Done. In Dashboard: Settings → API → reload schema, or wait ~1 min for cache.
-- =============================================================================
