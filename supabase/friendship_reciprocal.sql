-- Restore mutual friendship row when one side is inserted (needed for accept under RLS)
-- Run after friend_requests.sql

create or replace function public.friendship_reciprocal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.friendships (user_id, friend_id)
  values (new.friend_id, new.user_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists friendships_reciprocal on public.friendships;
create trigger friendships_reciprocal
  after insert on public.friendships
  for each row
  execute function public.friendship_reciprocal();
