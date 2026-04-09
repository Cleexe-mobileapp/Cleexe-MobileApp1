-- =============================================================================
-- Cleexe technical foundation: ensure public.profiles exists and matches app.
-- Required columns requested: id, display_name, bio, category
-- Also keeps compatibility columns used by current app code: username, avatar_url
-- =============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  bio text,
  category text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists category text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_profiles_username on public.profiles(username);

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), '')
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
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

alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_select"
on public.profiles for select
using (true);

create policy "profiles_insert"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles_update"
on public.profiles for update
using (auth.uid() = id);

insert into public.profiles (id, display_name, username, bio, category, avatar_url)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), '')
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'username'), ''),
    'user_' || substr(replace(u.id::text, '-', ''), 1, 8)
  ),
  nullif(trim(u.raw_user_meta_data->>'bio'), ''),
  nullif(trim(u.raw_user_meta_data->>'category'), ''),
  nullif(trim(u.raw_user_meta_data->>'avatar_url'), '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
