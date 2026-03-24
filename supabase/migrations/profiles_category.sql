-- Public profile category (preset list enforced in app)
alter table public.profiles
  add column if not exists category text;

comment on column public.profiles.category is 'User-selected profile category label (e.g. Athlete, Creator).';
