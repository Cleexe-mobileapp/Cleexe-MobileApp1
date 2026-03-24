-- Optional: add journal "day" column if you want a separate calendar date from created_at.
-- The app orders by created_at and maps display dates from date OR created_at.

alter table public.journal_entries
  add column if not exists date date default current_date;

create index if not exists idx_journal_user_date on public.journal_entries (user_id, date desc);
