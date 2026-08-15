alter table public.community_posts
  add column if not exists observation_note text,
  add column if not exists observed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_observation_note_length_check'
      and conrelid = 'public.community_posts'::regclass
  ) then
    alter table public.community_posts
      add constraint community_posts_observation_note_length_check
      check (observation_note is null or char_length(observation_note) <= 120);
  end if;
end $$;

create table if not exists public.community_post_bookmarks (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_comment_likes (
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists idx_community_post_bookmarks_user_created
  on public.community_post_bookmarks(user_id, created_at desc);

create index if not exists idx_community_comment_likes_user_created
  on public.community_comment_likes(user_id, created_at desc);

alter table public.community_post_bookmarks enable row level security;
alter table public.community_comment_likes enable row level security;

drop policy if exists "community_post_bookmarks_permanent_users_only" on public.community_post_bookmarks;
create policy "community_post_bookmarks_permanent_users_only"
  on public.community_post_bookmarks as restrictive for all
  to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false);

drop policy if exists "community_post_bookmarks_select_own" on public.community_post_bookmarks;
create policy "community_post_bookmarks_select_own"
  on public.community_post_bookmarks for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "community_post_bookmarks_insert_own" on public.community_post_bookmarks;
create policy "community_post_bookmarks_insert_own"
  on public.community_post_bookmarks for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.community_posts posts
      where posts.id = community_post_bookmarks.post_id
        and posts.status = 'ACTIVE'
        and posts.visibility = 'PUBLIC'
    )
  );

drop policy if exists "community_post_bookmarks_delete_own" on public.community_post_bookmarks;
create policy "community_post_bookmarks_delete_own"
  on public.community_post_bookmarks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "community_comment_likes_permanent_users_only" on public.community_comment_likes;
create policy "community_comment_likes_permanent_users_only"
  on public.community_comment_likes as restrictive for all
  to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false)
  with check (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false);

drop policy if exists "community_comment_likes_select_visible_thread" on public.community_comment_likes;
create policy "community_comment_likes_select_visible_thread"
  on public.community_comment_likes for select
  to authenticated
  using (
    exists (
      select 1
      from public.community_comments comments
      join public.community_posts posts on posts.id = comments.post_id
      where comments.id = community_comment_likes.comment_id
        and comments.status = 'ACTIVE'
        and posts.status = 'ACTIVE'
        and posts.visibility = 'PUBLIC'
    )
    or (select auth.uid()) = user_id
  );

drop policy if exists "community_comment_likes_insert_own" on public.community_comment_likes;
create policy "community_comment_likes_insert_own"
  on public.community_comment_likes for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.community_comments comments
      join public.community_posts posts on posts.id = comments.post_id
      where comments.id = community_comment_likes.comment_id
        and comments.status = 'ACTIVE'
        and posts.status = 'ACTIVE'
        and posts.visibility = 'PUBLIC'
    )
  );

drop policy if exists "community_comment_likes_delete_own" on public.community_comment_likes;
create policy "community_comment_likes_delete_own"
  on public.community_comment_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.community_post_bookmarks to authenticated;
grant select, insert, delete on public.community_comment_likes to authenticated;
