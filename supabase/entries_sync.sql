-- Private tracker entries + started_on (run in Supabase SQL Editor)
-- Keeps history off the friends feed (goon_posts).

alter table public.profiles
  add column if not exists started_on text;

create table if not exists public.tracker_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  minutes int not null check (minutes >= 0),
  goonometer int not null check (goonometer >= 0 and goonometer <= 10),
  comment text not null default '',
  date text not null,
  created_at timestamptz not null default now()
);

create index if not exists tracker_entries_user_date_idx
  on public.tracker_entries (user_id, date desc);

create index if not exists tracker_entries_user_created_idx
  on public.tracker_entries (user_id, created_at desc);

alter table public.tracker_entries enable row level security;

grant select, insert, update, delete on public.tracker_entries to authenticated;

drop policy if exists "tracker_entries_select_own" on public.tracker_entries;
create policy "tracker_entries_select_own"
  on public.tracker_entries for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "tracker_entries_insert_own" on public.tracker_entries;
create policy "tracker_entries_insert_own"
  on public.tracker_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "tracker_entries_update_own" on public.tracker_entries;
create policy "tracker_entries_update_own"
  on public.tracker_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tracker_entries_delete_own" on public.tracker_entries;
create policy "tracker_entries_delete_own"
  on public.tracker_entries for delete
  to authenticated
  using (auth.uid() = user_id);
