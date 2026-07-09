alter table public.community_posts
  add column if not exists title text not null default '',
  add column if not exists topic text not null default 'SIGHTING',
  add column if not exists region_name text,
  add column if not exists cat_id uuid references public.cats(id) on delete set null;

update public.community_posts
set title = left(nullif(trim(content), ''), 48)
where title = '' and nullif(trim(content), '') is not null;

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
