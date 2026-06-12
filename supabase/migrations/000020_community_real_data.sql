create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  visibility text not null default 'PUBLIC' check (visibility in ('PUBLIC', 'FOLLOWERS', 'PRIVATE')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'HIDDEN', 'DELETED', 'REPORTED', 'PENDING_REVIEW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  type text not null check (type in ('IMAGE', 'VIDEO')),
  url text not null,
  thumbnail_url text,
  width integer,
  height integer,
  duration_sec integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'HIDDEN', 'DELETED', 'REPORTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('POST', 'COMMENT')),
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('SPAM', 'ABUSE', 'INAPPROPRIATE_IMAGE', 'PRIVACY', 'ANIMAL_ABUSE', 'LOCATION_EXPOSURE', 'ETC')),
  detail text,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

create index if not exists idx_community_posts_active_created_at
  on public.community_posts(status, visibility, created_at desc);

create index if not exists idx_community_posts_author_created_at
  on public.community_posts(author_id, created_at desc);

create index if not exists idx_community_post_media_post_sort
  on public.community_post_media(post_id, sort_order asc);

create index if not exists idx_community_comments_post_created_at
  on public.community_comments(post_id, status, created_at asc);

create index if not exists idx_community_reports_reporter_created_at
  on public.community_reports(reporter_id, created_at desc);

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

drop trigger if exists community_comments_set_updated_at on public.community_comments;
create trigger community_comments_set_updated_at
  before update on public.community_comments
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media',
  'community-media',
  false,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.community_posts enable row level security;
alter table public.community_post_media enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reports enable row level security;

drop policy if exists "community_posts_select_visible" on public.community_posts;
create policy "community_posts_select_visible"
  on public.community_posts for select
  to authenticated
  using (
    status = 'ACTIVE'
    and (visibility = 'PUBLIC' or author_id = (select auth.uid()))
  );

drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own"
  on public.community_posts for insert
  to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "community_posts_update_own" on public.community_posts;
create policy "community_posts_update_own"
  on public.community_posts for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "community_post_media_select_visible_post" on public.community_post_media;
create policy "community_post_media_select_visible_post"
  on public.community_post_media for select
  to authenticated
  using (
    exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.status = 'ACTIVE'
        and (posts.visibility = 'PUBLIC' or posts.author_id = (select auth.uid()))
    )
  );

drop policy if exists "community_post_media_insert_own_post" on public.community_post_media;
create policy "community_post_media_insert_own_post"
  on public.community_post_media for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.author_id = (select auth.uid())
    )
  );

drop policy if exists "community_post_media_update_own_post" on public.community_post_media;
create policy "community_post_media_update_own_post"
  on public.community_post_media for update
  to authenticated
  using (
    exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.author_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.author_id = (select auth.uid())
    )
  );

drop policy if exists "community_post_media_delete_own_post" on public.community_post_media;
create policy "community_post_media_delete_own_post"
  on public.community_post_media for delete
  to authenticated
  using (
    exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.author_id = (select auth.uid())
    )
  );

drop policy if exists "community_post_likes_select_visible" on public.community_post_likes;
create policy "community_post_likes_select_visible"
  on public.community_post_likes for select
  to authenticated
  using (
    exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.status = 'ACTIVE'
        and (posts.visibility = 'PUBLIC' or posts.author_id = (select auth.uid()))
    )
  );

drop policy if exists "community_post_likes_insert_own" on public.community_post_likes;
create policy "community_post_likes_insert_own"
  on public.community_post_likes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "community_post_likes_delete_own" on public.community_post_likes;
create policy "community_post_likes_delete_own"
  on public.community_post_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "community_comments_select_visible_post" on public.community_comments;
create policy "community_comments_select_visible_post"
  on public.community_comments for select
  to authenticated
  using (
    status = 'ACTIVE'
    and exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.status = 'ACTIVE'
        and (posts.visibility = 'PUBLIC' or posts.author_id = (select auth.uid()))
    )
  );

drop policy if exists "community_comments_insert_own" on public.community_comments;
create policy "community_comments_insert_own"
  on public.community_comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.status = 'ACTIVE'
        and (posts.visibility = 'PUBLIC' or posts.author_id = (select auth.uid()))
    )
  );

drop policy if exists "community_comments_update_own" on public.community_comments;
create policy "community_comments_update_own"
  on public.community_comments for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "community_reports_select_own" on public.community_reports;
create policy "community_reports_select_own"
  on public.community_reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

drop policy if exists "community_reports_insert_own" on public.community_reports;
create policy "community_reports_insert_own"
  on public.community_reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

drop policy if exists "community_media_select_authenticated" on storage.objects;
create policy "community_media_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'community-media');

drop policy if exists "community_media_insert_own" on storage.objects;
create policy "community_media_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-media'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "community_media_update_own" on storage.objects;
create policy "community_media_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'community-media'
    and owner = (select auth.uid())
  )
  with check (
    bucket_id = 'community-media'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "community_media_delete_own" on storage.objects;
create policy "community_media_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-media'
    and owner = (select auth.uid())
  );

grant select, insert, update on public.community_posts to authenticated;
grant select, insert, update, delete on public.community_post_media to authenticated;
grant select, insert, delete on public.community_post_likes to authenticated;
grant select, insert, update on public.community_comments to authenticated;
grant select, insert on public.community_reports to authenticated;
