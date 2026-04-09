-- =============================================================================
-- Transformation Journey: profiles extensions + journey_entries
-- =============================================================================

alter table public.profiles add column if not exists onboarding_answers jsonb;
alter table public.profiles add column if not exists journey_stages jsonb;
alter table public.profiles add column if not exists identity_snapshots jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists somatic_logs jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists journey_launch_seen boolean not null default false;

-- Existing users who already finished onboarding should not see the launch modal again
update public.profiles
set journey_launch_seen = true
where onboarding_completed = true;

create table if not exists public.journey_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null
    check (entry_type in ('mirror', 'mythic', 'future_self', 'somatic', 'recalibration')),
  stage text,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_journey_entries_user_created
  on public.journey_entries (user_id, created_at desc);

alter table public.journey_entries enable row level security;

drop policy if exists "journey_entries_select_own" on public.journey_entries;
drop policy if exists "journey_entries_insert_own" on public.journey_entries;
drop policy if exists "journey_entries_update_own" on public.journey_entries;
drop policy if exists "journey_entries_delete_own" on public.journey_entries;

create policy "journey_entries_select_own"
  on public.journey_entries for select
  using (auth.uid() = user_id);

create policy "journey_entries_insert_own"
  on public.journey_entries for insert
  with check (auth.uid() = user_id);

create policy "journey_entries_update_own"
  on public.journey_entries for update
  using (auth.uid() = user_id);

create policy "journey_entries_delete_own"
  on public.journey_entries for delete
  using (auth.uid() = user_id);
