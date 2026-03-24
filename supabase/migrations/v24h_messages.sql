-- 24h video bubble wall foundation

create table if not exists public.v24h_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_url text not null,
  thumbnail_url text,
  is_private boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (now() + interval '24 hours') not null
);

alter table public.v24h_messages enable row level security;

create index if not exists idx_v24h_messages_expires_at on public.v24h_messages(expires_at desc);
create index if not exists idx_v24h_messages_user_created on public.v24h_messages(user_id, created_at desc);

drop policy if exists "Anyone can view active 24h videos" on public.v24h_messages;
create policy "Anyone can view active 24h videos"
on public.v24h_messages for select
using (expires_at > now());

drop policy if exists "Users can upload their own videos" on public.v24h_messages;
create policy "Users can upload their own videos"
on public.v24h_messages for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own 24h videos" on public.v24h_messages;
create policy "Users can delete own 24h videos"
on public.v24h_messages for delete
using (auth.uid() = user_id);

create or replace function public.can_user_post_24h(user_uuid uuid, is_premium boolean)
returns json as $$
declare
  last_post_time timestamp with time zone;
  cooldown_interval interval;
begin
  if is_premium then
    cooldown_interval := interval '1 hour';
  else
    cooldown_interval := interval '10 hours';
  end if;

  select created_at
  into last_post_time
  from public.v24h_messages
  where user_id = user_uuid
  order by created_at desc
  limit 1;

  if last_post_time is null or (now() - last_post_time) > cooldown_interval then
    return json_build_object('can_post', true, 'remaining_time', '00:00:00');
  end if;

  return json_build_object(
    'can_post', false,
    'remaining_time', (cooldown_interval - (now() - last_post_time))
  );
end;
$$ language plpgsql stable;

-- Helper for scheduled cleanup (run via pg_cron or Edge Function scheduler)
create or replace function public.cleanup_expired_24h_messages()
returns integer as $$
declare
  deleted_count integer;
begin
  delete from public.v24h_messages
  where expires_at <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql security definer;
