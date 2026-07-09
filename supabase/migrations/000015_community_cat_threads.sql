create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  visibility text not null default 'PUBLIC' check (visibility in ('PUBLIC')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'HIDDEN', 'DELETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'HIDDEN', 'DELETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

drop trigger if exists community_comments_set_updated_at on public.community_comments;
create trigger community_comments_set_updated_at
  before update on public.community_comments
  for each row execute function public.set_updated_at();

alter table public.community_posts
  add column if not exists title text not null default '',
  add column if not exists topic text not null default 'SIGHTING',
  add column if not exists region_name text,
  add column if not exists cat_id uuid references public.cats(id) on delete set null;

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
