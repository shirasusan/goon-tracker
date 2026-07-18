-- Goon Tracker schema (run in Supabase SQL Editor)
-- Auth: enable Email provider, disable "Confirm email" for easy username/password signup
-- (Authentication → Providers → Email → Confirm email = OFF)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  name text not null default '',
  username text unique,
  level int not null default 1,
  xp int not null default 0,
  goon_streak int not null default 0,
  dry_streak int not null default 0,
  total_minutes int not null default 0,
  categories jsonb not null default '{}'::jsonb,
  rank_id text not null default 'unranked',
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists rank_id text default 'unranked';

create unique index if not exists profiles_username_idx on public.profiles (username)
  where username is not null;
create index if not exists profiles_code_idx on public.profiles (code);
create index if not exists profiles_total_minutes_idx on public.profiles (total_minutes desc);

create table if not exists public.friendships (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friendships_no_self check (user_id <> friend_id)
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  link text not null,
  created_at timestamptz not null default now()
);

create index if not exists recommendations_user_idx on public.recommendations (user_id);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.recommendations enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own"
  on public.friendships for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "rec_select" on public.recommendations;
create policy "rec_select"
  on public.recommendations for select
  to authenticated
  using (
    user_id = auth.uid()
    or user_id in (select friend_id from public.friendships where user_id = auth.uid())
  );

drop policy if exists "rec_insert" on public.recommendations;
create policy "rec_insert"
  on public.recommendations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "rec_delete" on public.recommendations;
create policy "rec_delete"
  on public.recommendations for delete
  to authenticated
  using (auth.uid() = user_id);
