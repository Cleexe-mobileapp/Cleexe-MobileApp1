-- If posts_load says column journal_entries.created_at does not exist, run this.

alter table public.journal_entries
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_journal_user_created
  on public.journal_entries (user_id, created_at desc);
