-- Tighten shared catdex RPC execution permissions.
--
-- Why the advisor warns:
-- - These RPCs live in the exposed `public` schema.
-- - They were created as SECURITY DEFINER.
-- - PostgreSQL grants EXECUTE on new functions to PUBLIC by default unless revoked.
--   In Supabase that makes the functions callable through `/rest/v1/rpc/*`.
--
-- Intended access model:
-- - Anonymous users cannot call shared catdex RPCs.
-- - Signed-in users can call the public RPC names.
-- - Public RPC wrappers run as SECURITY INVOKER.
-- - Only narrow private helpers use SECURITY DEFINER for cross-user public
--   collection summaries, and they derive the viewer from auth.uid().

revoke execute on function public.get_public_collection_detail(uuid) from public, anon;
revoke execute on function public.list_public_collection_rankings() from public, anon;
revoke execute on function public.toggle_collection_like(uuid) from public, anon;
revoke execute on function public.toggle_collection_follow(uuid) from public, anon;

revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.public_collection_summary(p_owner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
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
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into next_profile
  from public.collection_profiles
  where user_id = p_owner_id;

  if next_profile.user_id is null then
    return null;
  end if;

  if not next_profile.is_public and p_owner_id <> current_user_id then
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
      and liked_by = current_user_id
  );

  viewer_following := exists (
    select 1
    from public.collection_follows
    where followed_id = p_owner_id
      and follower_id = current_user_id
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
      'isOwner', p_owner_id = current_user_id
    )
  );
end;
$$;

create or replace function private.list_public_collection_rankings()
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

  select coalesce(jsonb_agg(private.public_collection_summary(ranked.user_id)), '[]'::jsonb)
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

create or replace function public.get_public_collection_detail(p_owner_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.public_collection_summary(p_owner_id);
$$;

create or replace function public.list_public_collection_rankings()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.list_public_collection_rankings();
$$;

create or replace function public.toggle_collection_like(p_owner_id uuid)
returns jsonb
language plpgsql
security invoker
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
security invoker
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

drop function if exists private.public_collection_summary(uuid, uuid);

revoke execute on function public.get_public_collection_detail(uuid) from public, anon;
revoke execute on function public.list_public_collection_rankings() from public, anon;
revoke execute on function public.toggle_collection_like(uuid) from public, anon;
revoke execute on function public.toggle_collection_follow(uuid) from public, anon;

revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

grant execute on function public.get_public_collection_detail(uuid) to authenticated;
grant execute on function public.list_public_collection_rankings() to authenticated;
grant execute on function public.toggle_collection_like(uuid) to authenticated;
grant execute on function public.toggle_collection_follow(uuid) to authenticated;

grant execute on function private.ensure_region(text) to authenticated;
grant execute on function private.record_cat_encounter_shared(uuid, text, text, text) to authenticated;
grant execute on function private.public_collection_summary(uuid) to authenticated;
grant execute on function private.list_public_collection_rankings() to authenticated;
