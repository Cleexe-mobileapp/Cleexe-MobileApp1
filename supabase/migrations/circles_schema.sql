-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Cleexe Growth Circles — Partner / Squad / Way tables
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Circles (covers partner, squad, way)
create table if not exists public.circles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('partner', 'squad', 'way')),
  owner_id    uuid references auth.users(id) on delete cascade not null,
  focus       text,
  description text,
  max_members int not null default 8,
  check_in    text default 'weekly',
  rules       jsonb default '{}',
  is_active   boolean default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_circles_type on public.circles (type, is_active);
create index if not exists idx_circles_owner on public.circles (owner_id);

-- 2. Circle members (join table)
create table if not exists public.circle_members (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid references public.circles(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  role       text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at  timestamptz not null default now(),

  unique (circle_id, user_id)
);

create index if not exists idx_circle_members_user on public.circle_members (user_id);
create index if not exists idx_circle_members_circle on public.circle_members (circle_id);

-- 3. Circle matching queue (for partner + squad auto-matching)
create table if not exists public.circle_matches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  match_type      text not null check (match_type in ('partner', 'squad')),
  preferences     jsonb not null default '{}',
  -- preferences example: { "focus": "Business Growth", "timezone": "EST", "check_in": "Daily" }
  is_premium      boolean default false,
  status          text not null default 'pending' check (status in ('pending', 'matched', 'expired', 'cancelled')),
  matched_with    uuid references auth.users(id),
  matched_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_circle_matches_pending
  on public.circle_matches (match_type, status, created_at desc)
  where status = 'pending';

-- 4. Way listings (international help offers)
create table if not exists public.way_listings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  city        text not null,
  country     text not null,
  offering    text not null,
  tags        text[] default '{}',
  helpful     int default 0,
  is_active   boolean default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_way_listings_active
  on public.way_listings (is_active, created_at desc);

-- 5. Way requests
create table if not exists public.way_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  text        text not null,
  target_city text not null,
  replies     int default 0,
  created_at  timestamptz not null default now()
);

-- 6. RLS Policies

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_matches enable row level security;
alter table public.way_listings enable row level security;
alter table public.way_requests enable row level security;

-- Circles: readable by all, writable by owner
create policy "Circles are publicly readable"
  on public.circles for select using (true);

create policy "Users can create circles"
  on public.circles for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their circles"
  on public.circles for update
  using (auth.uid() = owner_id);

-- Circle members: readable by circle members, joinable by anyone
create policy "Circle members are readable by members"
  on public.circle_members for select
  using (
    exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_members.circle_id
      and cm.user_id = auth.uid()
    )
  );

create policy "Users can join circles"
  on public.circle_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave circles"
  on public.circle_members for delete
  using (auth.uid() = user_id);

-- Matching: users see their own matches
create policy "Users see own matches"
  on public.circle_matches for select
  using (auth.uid() = user_id or auth.uid() = matched_with);

create policy "Users can create match requests"
  on public.circle_matches for insert
  with check (auth.uid() = user_id);

-- Way listings: readable by all
create policy "Way listings are publicly readable"
  on public.way_listings for select using (true);

create policy "Users can create way listings"
  on public.way_listings for insert
  with check (auth.uid() = user_id);

-- Way requests: readable by all, writable by owner
create policy "Way requests are publicly readable"
  on public.way_requests for select using (true);

create policy "Users can create way requests"
  on public.way_requests for insert
  with check (auth.uid() = user_id);
