-- Goon Tracker 1.0 launch wipe
-- Run in Supabase → SQL Editor (as project owner / service role)
-- WARNING: deletes ALL users, profiles, feed, friends, recs, season data

-- 1) App data (order + cascade covers FKs)
truncate table
  public.goon_comments,
  public.goon_posts,
  public.recommendations,
  public.friend_requests,
  public.friendships,
  public.season_stats,
  public.profiles
restart identity cascade;

-- 2) Auth accounts (test + real — everything)
delete from auth.users;

-- 3) Storage (avatars + rec media)
delete from storage.objects where bucket_id in ('avatars', 'rec-media');
