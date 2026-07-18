-- Ranked anonymity (run in Supabase SQL Editor)

alter table public.profiles
  add column if not exists ranked_anonymous boolean not null default false;
