-- Recommendation reactions (run in Supabase SQL Editor)
-- up / mid / down — one reaction per user per recommendation

create table if not exists public.recommendation_reactions (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction text not null check (reaction in ('up', 'mid', 'down')),
  created_at timestamptz not null default now(),
  unique (recommendation_id, user_id)
);

create index if not exists recommendation_reactions_rec_idx
  on public.recommendation_reactions (recommendation_id);

alter table public.recommendation_reactions enable row level security;

grant select, insert, update, delete on public.recommendation_reactions to authenticated;

drop policy if exists "rec_reactions_select" on public.recommendation_reactions;
create policy "rec_reactions_select"
  on public.recommendation_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id
        and (
          r.user_id = auth.uid()
          or exists (
            select 1 from public.friendships f
            where f.user_id = auth.uid() and f.friend_id = r.user_id
          )
        )
    )
  );

drop policy if exists "rec_reactions_insert" on public.recommendation_reactions;
create policy "rec_reactions_insert"
  on public.recommendation_reactions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id
        and (
          r.user_id = auth.uid()
          or exists (
            select 1 from public.friendships f
            where f.user_id = auth.uid() and f.friend_id = r.user_id
          )
        )
    )
  );

drop policy if exists "rec_reactions_update" on public.recommendation_reactions;
create policy "rec_reactions_update"
  on public.recommendation_reactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "rec_reactions_delete" on public.recommendation_reactions;
create policy "rec_reactions_delete"
  on public.recommendation_reactions for delete
  to authenticated
  using (auth.uid() = user_id);
