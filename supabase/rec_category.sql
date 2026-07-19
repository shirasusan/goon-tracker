-- Recommendation category (run in Supabase SQL Editor)

alter table public.recommendations
  add column if not exists category text;

-- Optional backfill: leave null for legacy rows (shown only when filter = all)
