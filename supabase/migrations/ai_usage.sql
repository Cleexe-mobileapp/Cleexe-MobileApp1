-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Cleexe AI Usage Tracking — per-user analytics + cost control
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create table if not exists public.ai_usage (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  model           text not null,
  task            text not null default 'direct',
  prompt_chars    int not null default 0,
  response_chars  int not null default 0,
  latency_ms      int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists idx_ai_usage_user
  on public.ai_usage (user_id, created_at desc);

create index if not exists idx_ai_usage_model
  on public.ai_usage (model, created_at desc);

alter table public.ai_usage enable row level security;

create policy "Users can read own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

create policy "Edge functions can insert AI usage"
  on public.ai_usage for insert
  with check (true);

-- Aggregate view for dashboards / cost monitoring
create or replace view public.ai_usage_daily as
select
  date_trunc('day', created_at) as day,
  model,
  task,
  count(*) as request_count,
  sum(prompt_chars) as total_prompt_chars,
  sum(response_chars) as total_response_chars,
  avg(latency_ms)::int as avg_latency_ms,
  count(distinct user_id) as unique_users
from public.ai_usage
group by 1, 2, 3
order by 1 desc, 2;

-- Auto-cleanup: delete usage logs older than 90 days
create or replace function public.cleanup_old_ai_usage()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.ai_usage
  where created_at < now() - interval '90 days';
end;
$$;
