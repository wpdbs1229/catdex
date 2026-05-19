alter table public.collection_profiles
  add column if not exists is_public boolean not null default true;

create table if not exists public.collection_likes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  liked_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, liked_by),
  check (owner_id <> liked_by)
);

create table if not exists public.collection_follows (
  followed_id uuid not null references auth.users(id) on delete cascade,
  follower_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (followed_id, follower_id),
  check (followed_id <> follower_id)
);

create index if not exists idx_collection_likes_owner_created on public.collection_likes(owner_id, created_at desc);
create index if not exists idx_collection_likes_liked_by_created on public.collection_likes(liked_by, created_at desc);
create index if not exists idx_collection_follows_followed_created on public.collection_follows(followed_id, created_at desc);
create index if not exists idx_collection_follows_follower_created on public.collection_follows(follower_id, created_at desc);
create index if not exists idx_collection_profiles_public on public.collection_profiles(is_public, updated_at desc);

alter table public.collection_likes enable row level security;
alter table public.collection_follows enable row level security;

drop policy if exists "collection_profiles_select_public" on public.collection_profiles;
create policy "collection_profiles_select_public"
  on public.collection_profiles for select
  to authenticated
  using (is_public);

create policy "collection_likes_select_own_or_public_owner"
  on public.collection_likes for select
  to authenticated
  using (
    (select auth.uid()) = liked_by
    or exists (
      select 1
      from public.collection_profiles
      where user_id = owner_id
        and is_public
    )
  );

create policy "collection_likes_insert_own"
  on public.collection_likes for insert
  to authenticated
  with check (
    (select auth.uid()) = liked_by
    and owner_id <> liked_by
    and exists (
      select 1
      from public.collection_profiles
      where user_id = owner_id
        and is_public
    )
  );

create policy "collection_likes_delete_own"
  on public.collection_likes for delete
  to authenticated
  using ((select auth.uid()) = liked_by);

create policy "collection_follows_select_own_or_public_followed"
  on public.collection_follows for select
  to authenticated
  using (
    (select auth.uid()) = follower_id
    or exists (
      select 1
      from public.collection_profiles
      where user_id = followed_id
        and is_public
    )
  );

create policy "collection_follows_insert_own"
  on public.collection_follows for insert
  to authenticated
  with check (
    (select auth.uid()) = follower_id
    and followed_id <> follower_id
    and exists (
      select 1
      from public.collection_profiles
      where user_id = followed_id
        and is_public
    )
  );

create policy "collection_follows_delete_own"
  on public.collection_follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

create or replace function private.public_collection_summary(p_owner_id uuid, p_viewer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  next_profile public.collection_profiles;
  next_theme public.collection_themes;
  owner_profile public.profiles;
  has_nyangkkureomi boolean;
  collected_count integer;
  badge_count integer;
  stamp_count integer;
  like_count integer;
  follower_count integer;
  viewer_liked boolean;
  viewer_following boolean;
  featured_cats jsonb;
begin
  select * into next_profile
  from public.collection_profiles
  where user_id = p_owner_id;

  if next_profile.user_id is null then
    return null;
  end if;

  if not next_profile.is_public and p_owner_id <> p_viewer_id then
    return null;
  end if;

  select * into next_theme
  from public.collection_themes
  where id = next_profile.cover_theme_id;

  select * into owner_profile
  from public.profiles
  where id = p_owner_id;

  has_nyangkkureomi := private.user_has_nyangkkureomi(p_owner_id);

  select count(*)::integer into collected_count
  from public.user_cat_collections
  where user_id = p_owner_id;

  select count(*)::integer into badge_count
  from public.user_badges
  where user_id = p_owner_id;

  select count(*)::integer into stamp_count
  from public.user_season_stamps
  where user_id = p_owner_id;

  select count(*)::integer into like_count
  from public.collection_likes
  where owner_id = p_owner_id;

  select count(*)::integer into follower_count
  from public.collection_follows
  where followed_id = p_owner_id;

  viewer_liked := exists (
    select 1
    from public.collection_likes
    where owner_id = p_owner_id
      and liked_by = p_viewer_id
  );

  viewer_following := exists (
    select 1
    from public.collection_follows
    where followed_id = p_owner_id
      and follower_id = p_viewer_id
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slot', featured.slot,
        'id', cats.id,
        'number', cats.number,
        'name', cats.name,
        'type', cats.type,
        'imageUrl', cats.image_url
      )
      order by featured.slot
    ),
    '[]'::jsonb
  )
  into featured_cats
  from public.featured_cats featured
  join public.cats cats on cats.id = featured.cat_id
  where featured.user_id = p_owner_id;

  return jsonb_build_object(
    'ownerId', p_owner_id,
    'nickname', coalesce(owner_profile.nickname, '냥도감 탐험가'),
    'profileImageUrl', owner_profile.profile_image_url,
    'planName', case when has_nyangkkureomi then '냥꾸러미 사용 중' else '무료 서랍' end,
    'hasNyangkkureomi', has_nyangkkureomi,
    'profile', jsonb_build_object(
      'coverThemeId', next_profile.cover_theme_id,
      'displayTitle', next_profile.display_title,
      'intro', next_profile.intro,
      'selectedBadgeIds', next_profile.selected_badge_ids,
      'isPublic', next_profile.is_public
    ),
    'theme', jsonb_build_object(
      'id', next_theme.id,
      'name', next_theme.name,
      'description', next_theme.description,
      'palette', next_theme.palette,
      'isPremium', next_theme.is_premium
    ),
    'featuredCats', featured_cats,
    'stats', jsonb_build_object(
      'collectedCount', collected_count,
      'badgeCount', badge_count,
      'stampCount', stamp_count,
      'likeCount', like_count,
      'followerCount', follower_count
    ),
    'viewer', jsonb_build_object(
      'liked', viewer_liked,
      'following', viewer_following,
      'isOwner', p_owner_id = p_viewer_id
    )
  );
end;
$$;

create or replace function public.get_public_collection_detail(p_owner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  return private.public_collection_summary(p_owner_id, current_user_id);
end;
$$;

create or replace function public.list_public_collection_rankings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  rankings jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select coalesce(jsonb_agg(private.public_collection_summary(ranked.user_id, current_user_id)), '[]'::jsonb)
  into rankings
  from (
    select
      profiles.user_id,
      count(distinct likes.liked_by) as like_count,
      count(distinct collections.cat_id) as collected_count,
      max(collections.last_seen_at) as last_seen_at
    from public.collection_profiles profiles
    left join public.collection_likes likes on likes.owner_id = profiles.user_id
    left join public.user_cat_collections collections on collections.user_id = profiles.user_id
    where profiles.is_public
    group by profiles.user_id
    order by
      count(distinct likes.liked_by) desc,
      count(distinct collections.cat_id) desc,
      max(collections.last_seen_at) desc nulls last,
      profiles.user_id asc
    limit 30
  ) ranked;

  return rankings;
end;
$$;

create or replace function public.toggle_collection_like(p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_liked boolean;
  next_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_owner_id = current_user_id then
    raise exception '내 도감에는 좋아요를 누를 수 없습니다.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.collection_profiles
    where user_id = p_owner_id
      and is_public
  ) then
    raise exception '공개 도감만 좋아요할 수 있습니다.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.collection_likes
    where owner_id = p_owner_id
      and liked_by = current_user_id
  ) then
    delete from public.collection_likes
    where owner_id = p_owner_id
      and liked_by = current_user_id;
    next_liked := false;
  else
    insert into public.collection_likes (owner_id, liked_by)
    values (p_owner_id, current_user_id);
    next_liked := true;
  end if;

  select count(*)::integer into next_count
  from public.collection_likes
  where owner_id = p_owner_id;

  return jsonb_build_object('liked', next_liked, 'likeCount', next_count);
end;
$$;

create or replace function public.toggle_collection_follow(p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_following boolean;
  next_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_owner_id = current_user_id then
    raise exception '내 도감은 팔로우할 수 없습니다.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.collection_profiles
    where user_id = p_owner_id
      and is_public
  ) then
    raise exception '공개 도감만 팔로우할 수 있습니다.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.collection_follows
    where followed_id = p_owner_id
      and follower_id = current_user_id
  ) then
    delete from public.collection_follows
    where followed_id = p_owner_id
      and follower_id = current_user_id;
    next_following := false;
  else
    insert into public.collection_follows (followed_id, follower_id)
    values (p_owner_id, current_user_id);
    next_following := true;
  end if;

  select count(*)::integer into next_count
  from public.collection_follows
  where followed_id = p_owner_id;

  return jsonb_build_object('following', next_following, 'followerCount', next_count);
end;
$$;

grant select, insert, delete on public.collection_likes to authenticated;
grant select, insert, delete on public.collection_follows to authenticated;
grant execute on function public.get_public_collection_detail(uuid) to authenticated;
grant execute on function public.list_public_collection_rankings() to authenticated;
grant execute on function public.toggle_collection_like(uuid) to authenticated;
grant execute on function public.toggle_collection_follow(uuid) to authenticated;
