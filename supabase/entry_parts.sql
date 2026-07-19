-- Multi-category session parts on entries + feed posts.
-- Run in Supabase SQL Editor after goon_feed.sql / entries_sync.sql.

alter table public.tracker_entries
  add column if not exists parts jsonb;

alter table public.goon_posts
  add column if not exists parts jsonb;
