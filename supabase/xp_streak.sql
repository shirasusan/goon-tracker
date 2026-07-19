-- Entry XP + focus streak XP grants (run in Supabase SQL Editor)
-- Level XP can diverge from minutes (streak multipliers / focus daily grants).

alter table public.tracker_entries
  add column if not exists xp integer;

alter table public.profiles
  add column if not exists focus_xp_total integer not null default 0;

alter table public.profiles
  add column if not exists last_focus_xp_date text;
