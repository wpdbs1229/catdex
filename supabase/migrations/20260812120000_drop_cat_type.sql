-- cats.type과 cat_sightings.coat_type을 걷어낸다.
--
-- 두 컬럼은 컬러·무늬를 한국어 분류 하나로 접은 값이었다. 되돌릴 수 없는
-- 단방향 변환이라 데이터로 두면 원본과 어긋날 뿐이고, 원본 두 축은 이미
-- 모든 행에 들어 있다. 표시용 이름("고등어냥")은 화면이 두 축에서 그때그때
-- 만든다(클라이언트 deriveCatType).
--
-- 이 마이그레이션 뒤로 create_cat은 p_type을, create_cat_sighting은
-- p_coat_type을 받지 않는다. 앱과 함께 배포해야 한다.

-- 1) 후보 매칭: 털색 힌트를 분류가 아니라 컬러 배열과 맞춘다.
--
-- 겸사겸사 죽어 있던 가중치를 되살린다. 촬영 화면이 넘기는 coat_hints는
-- 'orange' 같은 컬러 id인데 여기서 cats.type('치즈냥')과 비교하고 있었다.
-- 어느 쪽도 서로 같을 수 없어 coat_match는 늘 거짓이었고, +0.08 가중치와
-- '털색이 비슷해요' 문구, 'neighborhood_recent_coat' 방법값이 한 번도
-- 나오지 않았다.
create or replace function public.generate_cat_match_candidates(
  p_observation_id uuid,
  p_region_names text[] default '{}',
  p_coat_hints text[] default '{}',
  p_limit integer default 5
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_observation public.cat_observations;
  candidate_region_names text[];
  effective_coat_hints text[];
  candidate_limit integer := least(greatest(coalesce(p_limit, 5), 1), 10);
  generated_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_observation_id is null then
    raise exception 'Observation is required' using errcode = '22023';
  end if;

  select observations.*
  into current_observation
  from public.cat_observations observations
  where observations.id = p_observation_id
    and observations.user_id = current_user_id;

  if not found then
    raise exception 'Observation not found' using errcode = 'P0002';
  end if;

  if current_observation.status <> 'pending' then
    raise exception 'Observation is already resolved' using errcode = '22023';
  end if;

  select array_agg(distinct trim(names.region_name))
  into candidate_region_names
  from unnest(
    coalesce(p_region_names, '{}'::text[])
      || array[current_observation.region_name]
  ) as names(region_name)
  where nullif(trim(names.region_name), '') is not null;

  effective_coat_hints := case
    when coalesce(array_length(p_coat_hints, 1), 0) > 0 then p_coat_hints
    else coalesce(current_observation.coat_hints, '{}'::text[])
  end;

  delete from public.cat_match_candidates candidates
  where candidates.observation_id = p_observation_id;

  with region_candidates as (
    select
      cat_regions.cat_id,
      max(cat_regions.last_seen_at) as last_seen_at,
      sum(cat_regions.encounter_count)::integer as region_encounter_count,
      bool_or(regions.name = current_observation.region_name) as exact_region_name
    from public.cat_regions cat_regions
    join public.regions regions on regions.id = cat_regions.region_id
    where regions.name = any(candidate_region_names)
    group by cat_regions.cat_id
  ),
  candidate_evidence as (
    select
      region_candidates.*,
      cats.number,
      cats.coat_colors && effective_coat_hints as coat_match,
      case
        when current_observation.embedding is not null
          and cats.embedding is not null
          and current_observation.embedding_version = cats.embedding_version
        then public.cosine_similarity(current_observation.embedding, cats.embedding)
        else null
      end as visual_similarity,
      exists (
        select 1
        from public.user_cat_collections collections
        where collections.user_id = current_user_id
          and collections.cat_id = region_candidates.cat_id
      ) as collected_by_user
    from region_candidates
    join public.cats cats on cats.id = region_candidates.cat_id
  ),
  scored_candidates as (
    select
      candidate_evidence.*,
      least(
        0.99,
        0.30
          + case when candidate_evidence.collected_by_user then 0.15 else 0 end
          + case when candidate_evidence.exact_region_name then 0.10 else 0.05 end
          + case when candidate_evidence.coat_match then 0.08 else 0 end
          + case
              when candidate_evidence.last_seen_at >= current_date - 30 then 0.15
              when candidate_evidence.last_seen_at >= current_date - 180 then 0.10
              else 0.05
            end
          + least(candidate_evidence.region_encounter_count, 20) * 0.005
          + greatest(coalesce(candidate_evidence.visual_similarity, 0), 0) * 0.25
      )::double precision as score
    from candidate_evidence
  ),
  ranked_candidates as (
    select
      scored_candidates.*,
      row_number() over (
        order by
          scored_candidates.score desc,
          scored_candidates.last_seen_at desc,
          scored_candidates.number asc
      )::integer as candidate_rank
    from scored_candidates
  ),
  inserted_candidates as (
    insert into public.cat_match_candidates (
      observation_id,
      cat_id,
      score,
      rank,
      reason,
      match_method,
      model_version
    )
    select
      p_observation_id,
      ranked_candidates.cat_id,
      ranked_candidates.score,
      ranked_candidates.candidate_rank,
      concat_ws(
        ' · ',
        case
          when ranked_candidates.collected_by_user then '내 도감에도 있는 고양이'
          else '현재 동네의 기존 고양이'
        end,
        case when coalesce(ranked_candidates.visual_similarity, 0) >= 0.5 then '사진 특징이 비슷해요' end,
        case when ranked_candidates.coat_match then '털색이 비슷해요' end,
        '최근 ' || to_char(ranked_candidates.last_seen_at, 'YYYY.MM.DD'),
        '동네 기록 ' || ranked_candidates.region_encounter_count || '회'
      ),
      case
        when ranked_candidates.visual_similarity is not null then 'visual_embedding'
        when ranked_candidates.coat_match then 'neighborhood_recent_coat'
        else 'neighborhood_recent'
      end,
      case
        when ranked_candidates.visual_similarity is not null then current_observation.embedding_version
        else null
      end
    from ranked_candidates
    where ranked_candidates.candidate_rank <= candidate_limit
    returning id
  )
  select count(*)::integer
  into generated_count
  from inserted_candidates;

  return generated_count;
end;
$$;

-- 2) 공개 도감 요약의 대표 고양이도 두 축을 그대로 내보낸다.
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
        'coatColors', cats.coat_colors,
        'coatPattern', cats.coat_pattern,
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

-- 3) 등록 RPC에서 분류 인자를 뺀다. 기본값이 붙은 인자를 지우는 것이라
--    옛 시그니처와 겹치지 않게 먼저 지운다.
drop function if exists public.create_cat(text, text, text[], text, text, text, text[], text, double precision, double precision, text);

create or replace function public.create_cat(
  p_name text,
  p_tags text[],
  p_region_name text,
  p_memo text,
  p_image_url text default null,
  p_coat_colors text[] default '{}',
  p_coat_pattern text default null,
  p_region_lat double precision default null,
  p_region_lng double precision default null,
  p_original_photo_url text default null
)
returns public.cats
language plpgsql
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_number integer;
  next_cat public.cats;
  next_encounter public.cat_encounters;
  next_region_id text;
  calculated_rarity integer;
  calculated_reasons text[];
  collected_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Cat name is required' using errcode = '22023';
  end if;

  if p_region_name is null or length(trim(p_region_name)) = 0 then
    raise exception 'Region name is required' using errcode = '22023';
  end if;

  select calculated.rarity, calculated.reasons
  into calculated_rarity, calculated_reasons
  from public.calculate_cat_rarity(coalesce(p_coat_colors, '{}'), p_coat_pattern, p_region_name) as calculated;

  perform pg_advisory_xact_lock(hashtext('shared_cat_number'));

  select coalesce(max(number), 0) + 1
  into next_number
  from public.cats;

  insert into public.cats (
    user_id,
    created_by,
    number,
    name,
    coat_colors,
    coat_pattern,
    rarity,
    rarity_reasons,
    encounter_count,
    first_seen_at,
    last_seen_at,
    relationship_level,
    tags,
    memo,
    image_url,
    representative_photo_url,
    original_photo_url
  )
  values (
    current_user_id,
    current_user_id,
    next_number,
    trim(p_name),
    coalesce(p_coat_colors, '{}'),
    p_coat_pattern,
    calculated_rarity,
    coalesce(calculated_reasons, '{}'::text[]),
    1,
    current_date,
    current_date,
    public.cat_relationship_level(1),
    coalesce(p_tags, '{}'),
    nullif(trim(coalesce(p_memo, '')), ''),
    p_image_url,
    p_image_url,
    p_original_photo_url
  )
  returning * into next_cat;

  insert into public.cat_encounters (user_id, cat_id, seen_at, region_name, memo, image_url, location_precision, is_public)
  values (current_user_id, next_cat.id, current_date, p_region_name, coalesce(p_memo, ''), p_image_url, 'region', true)
  returning * into next_encounter;

  insert into public.user_cat_collections (user_id, cat_id, first_collected_at, last_seen_at, encounter_count)
  values (current_user_id, next_cat.id, current_date, current_date, 1)
  on conflict (user_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.user_cat_collections.encounter_count + 1,
    updated_at = now();

  next_region_id := private.ensure_region(p_region_name, p_region_lat, p_region_lng);

  insert into public.region_cats (region_id, cat_id, user_id)
  values (next_region_id, next_cat.id, current_user_id)
  on conflict do nothing;

  insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
  values (next_region_id, next_cat.id, current_date, current_date, 1)
  on conflict (region_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.cat_regions.encounter_count + 1,
    updated_at = now();

  if p_image_url is not null then
    insert into public.cat_photos (cat_id, encounter_id, uploaded_by, image_url, is_representative, visibility)
    values (next_cat.id, next_encounter.id, current_user_id, coalesce(p_original_photo_url, p_image_url), true, 'public');
  end if;

  -- 이번 등록으로 상한이 올라갔다면 예전 기록의 별도 다시 본다.
  select count(*)
  into collected_count
  from public.user_cat_collections
  where user_cat_collections.user_id = current_user_id;

  if collected_count in (10, 30) then
    perform private.lift_collector_rarity_cap(current_user_id);

    select cats.rarity, cats.rarity_reasons
    into next_cat.rarity, next_cat.rarity_reasons
    from public.cats
    where cats.id = next_cat.id;
  end if;

  return next_cat;
end;
$$;

revoke all on function public.create_cat(text, text[], text, text, text, text[], text, double precision, double precision, text) from public;
revoke execute on function public.create_cat(text, text[], text, text, text, text[], text, double precision, double precision, text) from anon;
grant execute on function public.create_cat(text, text[], text, text, text, text[], text, double precision, double precision, text) to authenticated;

-- 4) 목격 등록도 마찬가지.
drop function if exists public.create_cat_sighting(text, text, text, text, text[], text);

create or replace function public.create_cat_sighting(
  p_region_name text,
  p_behavior_hint text default '',
  p_image_url text default null,
  p_coat_colors text[] default '{}',
  p_coat_pattern text default null
)
returns public.cat_sightings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_sighting public.cat_sightings;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_region_name is null or length(trim(p_region_name)) = 0 then
    raise exception 'Region name is required' using errcode = '22023';
  end if;

  insert into public.cat_sightings (
    reporter_id,
    region_name,
    coat_colors,
    coat_pattern,
    behavior_hint,
    image_url
  )
  values (
    current_user_id,
    trim(p_region_name),
    coalesce(p_coat_colors, '{}'),
    p_coat_pattern,
    trim(coalesce(p_behavior_hint, '')),
    p_image_url
  )
  returning * into next_sighting;

  return next_sighting;
end;
$$;

revoke all on function public.create_cat_sighting(text, text, text, text[], text) from public;
revoke execute on function public.create_cat_sighting(text, text, text, text[], text) from anon;
grant execute on function public.create_cat_sighting(text, text, text, text[], text) to authenticated;

-- 5) 컬럼을 지운다.
alter table public.cats
  drop constraint if exists cats_type_check;

alter table public.cats
  drop column if exists type;

alter table public.cat_sightings
  drop constraint if exists cat_sightings_coat_type_check;

alter table public.cat_sightings
  drop column if exists coat_type;
