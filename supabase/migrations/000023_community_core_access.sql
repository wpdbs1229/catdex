create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null,
  topic text not null default 'SIGHTING',
  region_name text,
  cat_id uuid references public.cats(id) on delete set null,
  visibility text not null default 'PUBLIC',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.community_posts
  add column if not exists title text not null default '',
  add column if not exists topic text not null default 'SIGHTING',
  add column if not exists region_name text,
  add column if not exists cat_id uuid references public.cats(id) on delete set null,
  add column if not exists visibility text not null default 'PUBLIC',
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists updated_at timestamptz not null default now();

alter table public.community_comments
  add column if not exists status text not null default 'ACTIVE',
  add column if not exists updated_at timestamptz not null default now();

update public.community_posts
set title = left(nullif(trim(content), ''), 48)
where title = '' and nullif(trim(content), '') is not null;

update public.community_posts
set topic = 'SIGHTING'
where topic is null or topic not in ('SIGHTING', 'VERIFY', 'STATUS', 'INFO');

update public.community_posts
set visibility = 'PUBLIC'
where visibility is null or visibility not in ('PUBLIC');

update public.community_posts
set status = 'ACTIVE'
where status is null or status not in ('ACTIVE', 'HIDDEN', 'DELETED');

update public.community_comments
set status = 'ACTIVE'
where status is null or status not in ('ACTIVE', 'HIDDEN', 'DELETED');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_topic_check'
      and conrelid = 'public.community_posts'::regclass
  ) then
    alter table public.community_posts
      add constraint community_posts_topic_check
      check (topic in ('SIGHTING', 'VERIFY', 'STATUS', 'INFO'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_visibility_check'
      and conrelid = 'public.community_posts'::regclass
  ) then
    alter table public.community_posts
      add constraint community_posts_visibility_check
      check (visibility in ('PUBLIC'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_status_check'
      and conrelid = 'public.community_posts'::regclass
  ) then
    alter table public.community_posts
      add constraint community_posts_status_check
      check (status in ('ACTIVE', 'HIDDEN', 'DELETED'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_comments_status_check'
      and conrelid = 'public.community_comments'::regclass
  ) then
    alter table public.community_comments
      add constraint community_comments_status_check
      check (status in ('ACTIVE', 'HIDDEN', 'DELETED'));
  end if;
end $$;

create index if not exists idx_community_posts_region_created
  on public.community_posts(region_name, created_at desc)
  where status = 'ACTIVE';

create index if not exists idx_community_posts_cat_created
  on public.community_posts(cat_id, created_at desc)
  where status = 'ACTIVE';

create index if not exists idx_community_posts_topic_created
  on public.community_posts(topic, created_at desc)
  where status = 'ACTIVE';

create index if not exists idx_community_comments_post_created
  on public.community_comments(post_id, created_at desc)
  where status = 'ACTIVE';

create index if not exists idx_community_post_likes_user
  on public.community_post_likes(user_id, created_at desc);

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

drop trigger if exists community_comments_set_updated_at on public.community_comments;
create trigger community_comments_set_updated_at
  before update on public.community_comments
  for each row execute function public.set_updated_at();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_likes enable row level security;

drop policy if exists "community_posts_select_public" on public.community_posts;
create policy "community_posts_select_public"
  on public.community_posts for select
  to authenticated
  using (
    (status = 'ACTIVE' and visibility = 'PUBLIC')
    or (select auth.uid()) = author_id
  );

drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own"
  on public.community_posts for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

drop policy if exists "community_posts_update_own" on public.community_posts;
create policy "community_posts_update_own"
  on public.community_posts for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

drop policy if exists "community_posts_delete_own" on public.community_posts;
create policy "community_posts_delete_own"
  on public.community_posts for delete
  to authenticated
  using ((select auth.uid()) = author_id);

drop policy if exists "community_comments_select_public_thread" on public.community_comments;
create policy "community_comments_select_public_thread"
  on public.community_comments for select
  to authenticated
  using (
    (
      status = 'ACTIVE'
      and exists (
        select 1
        from public.community_posts posts
        where posts.id = community_comments.post_id
          and posts.status = 'ACTIVE'
          and posts.visibility = 'PUBLIC'
      )
    )
    or (select auth.uid()) = author_id
  );

drop policy if exists "community_comments_insert_own_thread" on public.community_comments;
create policy "community_comments_insert_own_thread"
  on public.community_comments for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
      from public.community_posts posts
      where posts.id = community_comments.post_id
        and posts.status = 'ACTIVE'
        and posts.visibility = 'PUBLIC'
    )
  );

drop policy if exists "community_comments_update_own" on public.community_comments;
create policy "community_comments_update_own"
  on public.community_comments for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

drop policy if exists "community_comments_delete_own" on public.community_comments;
create policy "community_comments_delete_own"
  on public.community_comments for delete
  to authenticated
  using ((select auth.uid()) = author_id);

drop policy if exists "community_post_likes_select_public_thread" on public.community_post_likes;
create policy "community_post_likes_select_public_thread"
  on public.community_post_likes for select
  to authenticated
  using (
    exists (
      select 1
      from public.community_posts posts
      where posts.id = community_post_likes.post_id
        and posts.status = 'ACTIVE'
        and posts.visibility = 'PUBLIC'
    )
    or (select auth.uid()) = user_id
  );

drop policy if exists "community_post_likes_insert_own" on public.community_post_likes;
create policy "community_post_likes_insert_own"
  on public.community_post_likes for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.community_posts posts
      where posts.id = community_post_likes.post_id
        and posts.status = 'ACTIVE'
        and posts.visibility = 'PUBLIC'
    )
  );

drop policy if exists "community_post_likes_delete_own" on public.community_post_likes;
create policy "community_post_likes_delete_own"
  on public.community_post_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.community_comments to authenticated;
grant select, insert, delete on public.community_post_likes to authenticated;

do $$
begin
  if to_regprocedure('private.refresh_user_badges_from_community_comment()') is not null then
    execute 'drop trigger if exists community_comments_award_badges on public.community_comments';
    execute '
      create trigger community_comments_award_badges
        after insert or update or delete on public.community_comments
        for each row execute function private.refresh_user_badges_from_community_comment()
    ';
  end if;
end $$;
