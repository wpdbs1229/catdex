create or replace function private.validate_collection_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_badge_count integer;
  selected_stamp_count integer;
begin
  if not exists (
    select 1
    from public.collection_themes
    where id = new.cover_theme_id
  ) then
    raise exception 'Collection theme not found' using errcode = 'P0002';
  end if;

  selected_badge_count := coalesce(array_length(new.selected_badge_ids, 1), 0);

  if selected_badge_count > 0 and exists (
    select 1
    from unnest(new.selected_badge_ids) as selected_badge_id
    where not exists (
      select 1
      from public.user_badges
      where user_id = new.user_id
        and badge_id = selected_badge_id
    )
  ) then
    raise exception '획득한 골목 배지만 도감에 진열할 수 있습니다.' using errcode = '42501';
  end if;

  if selected_badge_count > 4 then
    raise exception '골목 배지는 최대 4개까지 진열할 수 있습니다.' using errcode = '22023';
  end if;

  selected_stamp_count := coalesce(array_length(new.selected_stamp_ids, 1), 0);

  if selected_stamp_count > 0 and exists (
    select 1
    from unnest(new.selected_stamp_ids) as selected_stamp_id
    where not exists (
      select 1
      from public.user_season_stamps
      where user_id = new.user_id
        and stamp_id = selected_stamp_id
    )
  ) then
    raise exception '획득한 냥발 도장만 도감에 진열할 수 있습니다.' using errcode = '42501';
  end if;

  if selected_stamp_count > 3 then
    raise exception '냥발 도장은 최대 3개까지 진열할 수 있습니다.' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_collection_profile() from public, anon, authenticated;

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
      'palette', next_theme.palette
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

revoke all on function private.public_collection_summary(uuid) from public, anon, authenticated;
grant execute on function private.public_collection_summary(uuid) to authenticated;

drop function if exists public.get_shared_map_regions();
drop function if exists private.user_has_shared_map_lifetime(uuid);

alter table public.collection_themes
  drop column if exists is_premium;

alter table public.season_stamps
  drop column if exists is_premium;
