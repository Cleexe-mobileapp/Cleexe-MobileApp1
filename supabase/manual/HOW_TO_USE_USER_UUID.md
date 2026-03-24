# Fixing `invalid input syntax for type uuid`

## What went wrong

SQL like this fails:

```sql
VALUES ('PASTE_THE_USER_UID_HERE');
```

The string **`PASTE_THE_USER_UID_HERE`** is a **placeholder**, not a real UUID. Postgres expects something like:

`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (hex digits only in each segment).

## What to do

1. Open **Supabase Dashboard → Authentication → Users**.
2. Click your user → copy **User UID** (a full UUID).
3. Paste that **exact** value into your query, in quotes:

```sql
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
```

## Avoid hard-coding: use a subquery

If the SQL is meant to target **your** logged-in account by email:

```sql
-- Example: pick user id by email (change the email)
SELECT id FROM auth.users WHERE email = 'you@example.com' LIMIT 1;
```

Then use it in another statement:

```sql
INSERT INTO public.profiles (id, username)
SELECT id, 'my_username'
FROM auth.users
WHERE email = 'you@example.com'
ON CONFLICT (id) DO NOTHING;
```

## Backfill all users (no UUID paste)

Use the scripts in this folder that insert from `auth.users` (e.g. `CREATE_PUBLIC_PROFILES.sql`) instead of pasting a single UID.
