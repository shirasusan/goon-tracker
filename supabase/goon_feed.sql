-- Goon feed + comments (run in Supabase SQL Editor after schema.sql)

create table if not exists public.goon_posts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  minutes int not null check (minutes >= 0),
  goonometer int not null check (goonometer >= 0 and goonometer <= 10),
  comment text not null default '',
  date text not null,
  created_at timestamptz not null default now()
);

create index if not exists goon_posts_created_idx
  on public.goon_posts (created_at desc);
create index if not exists goon_posts_user_idx
  on public.goon_posts (user_id, created_at desc);

create table if not exists public.goon_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.goon_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint goon_comments_body_len check (char_length(body) between 1 and 280)
);

create index if not exists goon_comments_post_idx
  on public.goon_comments (post_id, created_at asc);

alter table public.goon_posts enable row level security;
alter table public.goon_comments enable row level security;

grant select on public.goon_posts to authenticated;
grant insert, update, delete on public.goon_posts to authenticated;
grant select, insert, delete on public.goon_comments to authenticated;

drop policy if exists "goon_posts_select" on public.goon_posts;
create policy "goon_posts_select"
  on public.goon_posts for select
  to authenticated
  using (
    user_id = auth.uid()
    or user_id in (select friend_id from public.friendships where user_id = auth.uid())
  );

drop policy if exists "goon_posts_insert" on public.goon_posts;
create policy "goon_posts_insert"
  on public.goon_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "goon_posts_update" on public.goon_posts;
create policy "goon_posts_update"
  on public.goon_posts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "goon_posts_delete" on public.goon_posts;
create policy "goon_posts_delete"
  on public.goon_posts for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "goon_comments_select" on public.goon_comments;
create policy "goon_comments_select"
  on public.goon_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.goon_posts p
      where p.id = post_id
        and (
          p.user_id = auth.uid()
          or p.user_id in (
            select friend_id from public.friendships where user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "goon_comments_insert" on public.goon_comments;
create policy "goon_comments_insert"
  on public.goon_comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.goon_posts p
      where p.id = post_id
        and (
          p.user_id = auth.uid()
          or p.user_id in (
            select friend_id from public.friendships where user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "goon_comments_delete" on public.goon_comments;
create policy "goon_comments_delete"
  on public.goon_comments for delete
  to authenticated
  using (auth.uid() = user_id);
