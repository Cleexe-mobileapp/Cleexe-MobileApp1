-- ============================================================
-- Cleexe Full Database Schema
-- ============================================================

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  bio text,
  avatar_url text,
  website text,
  is_premium boolean not null default false,
  is_creator boolean not null default false,
  referral_code text unique,
  streak_visibility text not null default 'public' check (streak_visibility in ('public', 'private')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_referral_code on public.profiles(referral_code);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    null
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- 2. Journal entries
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  media_url text[],
  date date not null default current_date,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_journal_user_date on public.journal_entries(user_id, date desc);

-- 3. Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  target_days integer not null default 30,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'custom')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_goals_user on public.goals(user_id);

-- 4. Follows (chase system)
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id != followed_id)
);

create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_followed on public.follows(followed_id);

-- 5. Circles
create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_public boolean not null default true,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  avatar_url text,
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_circles_creator on public.circles(creator_id);

-- 6. Circle members
create table if not exists public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

-- Auto-update member_count
create or replace function public.update_circle_member_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.circles set member_count = member_count + 1 where id = new.circle_id;
  elsif tg_op = 'DELETE' then
    update public.circles set member_count = member_count - 1 where id = old.circle_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger circle_members_count
  after insert or delete on public.circle_members
  for each row execute function public.update_circle_member_count();

-- 7. Achievements
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  unique (user_id, achievement_key)
);

create index if not exists idx_achievements_user on public.achievements(user_id);

-- 8. Referrals
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_id text,
  commission numeric(10, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now()
);

create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.journal_entries enable row level security;
alter table public.goals enable row level security;
alter table public.follows enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.achievements enable row level security;
alter table public.referrals enable row level security;

-- Profiles: anyone can read, owners can update
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Journal entries: owner full access, public entries visible to all
create policy "journal_select_own" on public.journal_entries for select using (user_id = auth.uid());
create policy "journal_select_public" on public.journal_entries for select using (is_public = true);
create policy "journal_insert" on public.journal_entries for insert with check (user_id = auth.uid());
create policy "journal_update" on public.journal_entries for update using (user_id = auth.uid());
create policy "journal_delete" on public.journal_entries for delete using (user_id = auth.uid());

-- Goals: owner only
create policy "goals_select" on public.goals for select using (user_id = auth.uid());
create policy "goals_insert" on public.goals for insert with check (user_id = auth.uid());
create policy "goals_update" on public.goals for update using (user_id = auth.uid());
create policy "goals_delete" on public.goals for delete using (user_id = auth.uid());

-- Follows: anyone can see, authenticated users can insert/delete own
create policy "follows_select" on public.follows for select using (true);
create policy "follows_insert" on public.follows for insert with check (follower_id = auth.uid());
create policy "follows_delete" on public.follows for delete using (follower_id = auth.uid());

-- Circles: public circles visible to all, private only to members
create policy "circles_select_public" on public.circles for select using (is_public = true);
create policy "circles_select_member" on public.circles for select using (
  exists (select 1 from public.circle_members where circle_id = id and user_id = auth.uid())
);
create policy "circles_insert" on public.circles for insert with check (creator_id = auth.uid());
create policy "circles_update" on public.circles for update using (creator_id = auth.uid());

-- Circle members: visible to circle members, can join/leave
create policy "circle_members_select" on public.circle_members for select using (
  exists (select 1 from public.circle_members cm where cm.circle_id = circle_members.circle_id and cm.user_id = auth.uid())
);
create policy "circle_members_insert" on public.circle_members for insert with check (user_id = auth.uid());
create policy "circle_members_delete" on public.circle_members for delete using (user_id = auth.uid());

-- Achievements: owner can see all, others can see unlocked
create policy "achievements_select_own" on public.achievements for select using (user_id = auth.uid());
create policy "achievements_select_unlocked" on public.achievements for select using (unlocked = true);

-- Referrals: referrer can see own
create policy "referrals_select" on public.referrals for select using (referrer_id = auth.uid());

-- ============================================================
-- Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

create policy "avatar_upload" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.role() = 'authenticated'
);
create policy "avatar_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar_update" on storage.objects for update using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
