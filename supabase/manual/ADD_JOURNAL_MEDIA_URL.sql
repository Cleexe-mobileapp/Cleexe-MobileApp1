-- Add image attachments column if your journal table predates Cleexe migrations.
-- Fixes: column journal_entries.media_url does not exist

alter table public.journal_entries
  add column if not exists media_url text[];

comment on column public.journal_entries.media_url is 'Optional image URLs for journal entry (public grid thumbnails).';
