-- Run this once in Supabase: SQL Editor → New query → Run
-- Also enable: Authentication → Sign In / Providers → Anonymous → Enable

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  name text not null default '',
  level int not null default 1,
  xp int not null default 0,
  goon_streak int not null default 0,
  dry_streak int not null default 0,
  total_minutes int not null default 0,
  categories jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_code_idx on public.profiles (code);

create table if not exists public.friendships (
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friendships_no_self check (user_id <> friend_id)
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;

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
