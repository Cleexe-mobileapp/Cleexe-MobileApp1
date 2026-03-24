# Manual Supabase SQL

## `ADD_JOURNAL_CREATED_AT.sql`

Run if you see **`column journal_entries.created_at does not exist`**. The Profile **Flow** list sorts by **`created_at`**.

## `ADD_JOURNAL_DATE.sql`

Run if you use a **`date`** column for entries; the app **orders by `created_at`** and shows **`date` or `created_at`** in the Flow grid.

## `ADD_JOURNAL_MEDIA_URL.sql`

Run if you see **`column journal_entries.media_url does not exist`**. Adds `media_url text[]` for post thumbnails.

## `CREATE_AVATARS_BUCKET.sql`

Run if profile photo upload shows **“Bucket not found”**. Creates the **`avatars`** bucket and storage policies.  
Alternatively: **Dashboard → Storage → New bucket** → ID **`avatars`** → turn on **Public**.

To use another bucket name, set **`EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET`** in your Expo env and create that bucket in Supabase.

## `CREATE_PUBLIC_PROFILES.sql`

Run the full script in **Supabase Dashboard → SQL Editor → New query**, then **Run**.

It will:

- Create **`public.profiles`** (with **`category`**) if missing  
- Add RLS policies (select / insert own row / update own row)  
- Create **`handle_new_user`** so new signups get a profile row  
- **Backfill** existing `auth.users` into `profiles`  
- Copy **`bio`**, **`avatar_url`**, **`category`**, **`username`** from **Auth `user_metadata`** into `profiles` where empty (fixes data saved while the table was missing)  
- Ensure **`avatars`** storage bucket + basic policies for profile photos  

After running, wait a minute or use **Settings → API** so PostgREST picks up the schema (clears the “schema cache” error).

For the full Cleexe schema (journal, goals, follows, …), apply migrations under `supabase/migrations/` with the Supabase CLI (`supabase db push`) or run `000_full_schema.sql` on a fresh project.
