-- Friend requests (run in Supabase SQL Editor)
-- Replaces instant mutual friendships with pending → accept

-- Stop auto-reciprocal friendship inserts
drop trigger if exists friendships_reciprocal on public.friendships;
drop function if exists public.friendship_reciprocal();

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  constraint friend_requests_no_self check (from_user <> to_user)
);

create index if not exists friend_requests_to_pending_idx
  on public.friend_requests (to_user)
  where status = 'pending';

create index if not exists friend_requests_from_pending_idx
  on public.friend_requests (from_user)
  where status = 'pending';

alter table public.friend_requests enable row level security;

drop policy if exists "friend_requests_select" on public.friend_requests;
create policy "friend_requests_select"
  on public.friend_requests for select
  to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

drop policy if exists "friend_requests_insert" on public.friend_requests;
create policy "friend_requests_insert"
  on public.friend_requests for insert
  to authenticated
  with check (auth.uid() = from_user);

drop policy if exists "friend_requests_update" on public.friend_requests;
create policy "friend_requests_update"
  on public.friend_requests for update
  to authenticated
  using (auth.uid() = to_user or auth.uid() = from_user)
  with check (auth.uid() = to_user or auth.uid() = from_user);

drop policy if exists "friend_requests_delete" on public.friend_requests;
create policy "friend_requests_delete"
  on public.friend_requests for delete
  to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);
