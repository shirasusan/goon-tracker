-- Ranked: run this in Supabase SQL Editor if the Ranked leaderboard is empty/broken

create table if not exists public.season_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  season int not null,
  total_minutes int not null default 0,
  categories jsonb not null default '{}'::jsonb,
  rank_id text not null default 'unranked',
  updated_at timestamptz not null default now(),
  primary key (user_id, season)
);

create index if not exists season_stats_season_minutes_idx
  on public.season_stats (season, total_minutes desc);

alter table public.season_stats enable row level security;

grant select on public.season_stats to anon, authenticated;
grant insert, update on public.season_stats to authenticated;

drop policy if exists "season_stats_select_all" on public.season_stats;
create policy "season_stats_select_all"
  on public.season_stats for select
  to anon, authenticated
  using (true);

drop policy if exists "season_stats_upsert_own" on public.season_stats;
create policy "season_stats_upsert_own"
  on public.season_stats for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "season_stats_update_own" on public.season_stats;
create policy "season_stats_update_own"
  on public.season_stats for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed Season 1 from existing profiles so the board is not empty
insert into public.season_stats (user_id, season, total_minutes, categories, rank_id, updated_at)
select
  p.id,
  1,
  coalesce(p.total_minutes, 0),
  coalesce(p.categories, '{}'::jsonb),
  coalesce(p.rank_id, 'unranked'),
  now()
from public.profiles p
on conflict (user_id, season) do update set
  total_minutes = excluded.total_minutes,
  categories = excluded.categories,
  rank_id = excluded.rank_id,
  updated_at = now();
