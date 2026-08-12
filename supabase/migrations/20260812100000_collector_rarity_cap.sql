-- 많이 모을수록 높은 별에 닿을 수 있게 한다.
--
-- 가산이 아니라 상한이다. 수집 마릿수가 늘면 도달 가능한 최대 별이 올라갈 뿐,
-- 흔한 털색이 덩달아 부풀지는 않는다(주황 태비는 몇 마리를 모으든 2성).
--
--   수집 10마리 미만  최대 3성
--   수집 10~29마리    최대 4성
--   수집 30마리 이상  최대 5성
--
-- 상한이 올라간 시점에, 예전에 상한에 걸려 낮게 굳은 별도 함께 올려 준다.
-- 그러지 않으면 열 번째 고양이를 등록한 순간부터 "새로 만난 초콜릿 토티는 4성,
-- 아홉 번째까지 만난 같은 털색은 3성"으로 갈린다.

create or replace function public.collector_rarity_cap(p_collected_count integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_collected_count, 0) >= 30 then 5
    when coalesce(p_collected_count, 0) >= 10 then 4
    else 3
  end;
$$;

comment on function public.collector_rarity_cap(integer) is
  '수집 마릿수로 열리는 희귀도 상한. 별을 더해 주는 게 아니라 도달 가능한 천장을 올린다.';

create or replace function public.calculate_cat_rarity(
  p_coat_colors text[],
  p_coat_pattern text,
  p_region_name text
)
returns table (
  rarity integer,
  reasons text[]
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_coat_colors text[] := coalesce(p_coat_colors, '{}'::text[]);
  coat_name text := public.coat_label(v_coat_colors, p_coat_pattern);
  base_rarity integer := public.coat_base_rarity(v_coat_colors, p_coat_pattern);
  raw_rarity integer;
  final_rarity integer;
  reason_list text[] := array[]::text[];
  v_region_id text;
  region_total_count integer := 0;
  region_coat_count integer := 0;
  global_total_count integer := 0;
  global_coat_count integer := 0;
  global_coat_ratio numeric := 0;
  scarcity_bonus integer := 0;
  collected_count integer := 0;
  rarity_cap integer;
begin
  reason_list := array_append(reason_list, format('%s 기본 희귀도 %s성으로 시작했어요.', coat_name, base_rarity));

  select regions.id
  into v_region_id
  from public.regions
  where regions.name = trim(p_region_name)
  limit 1;

  if v_region_id is not null then
    select count(distinct cat_regions.cat_id)
    into region_total_count
    from public.cat_regions
    where cat_regions.region_id = v_region_id;

    -- "같은 털색"의 기준: 패턴이 같고 색이 하나라도 겹치는 개체.
    -- 고른 값이 비어 있는 축은 조건에서 빠진다(미상은 아무것도 걸러내지 않는다).
    select count(distinct cats.id)
    into region_coat_count
    from public.cat_regions
    join public.cats on cats.id = cat_regions.cat_id
    where cat_regions.region_id = v_region_id
      and (p_coat_pattern is null or cats.coat_pattern is not distinct from p_coat_pattern)
      and (coalesce(array_length(v_coat_colors, 1), 0) = 0 or cats.coat_colors && v_coat_colors);

    if region_total_count >= 3 and region_coat_count = 0 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(reason_list, format('%s에서 아직 %s 기록이 없어 +1성이 붙었어요.', trim(p_region_name), coat_name));
    elsif region_total_count >= 8 and region_coat_count <= 1 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(reason_list, format('%s에서 %s 기록이 드문 편이라 +1성이 붙었어요.', trim(p_region_name), coat_name));
    else
      reason_list := array_append(reason_list, format('%s의 기존 발견 분포도 함께 확인했어요.', trim(p_region_name)));
    end if;
  else
    reason_list := array_append(reason_list, '아직 동네 표본이 적어 털색 기본값 중심으로 산정했어요.');
  end if;

  select count(*)
  into global_total_count
  from public.cats;

  select count(*)
  into global_coat_count
  from public.cats
  where (p_coat_pattern is null or cats.coat_pattern is not distinct from p_coat_pattern)
    and (coalesce(array_length(v_coat_colors, 1), 0) = 0 or cats.coat_colors && v_coat_colors);

  if global_total_count >= 10 then
    global_coat_ratio := global_coat_count::numeric / global_total_count::numeric;

    if global_coat_ratio < 0.12 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(
        reason_list,
        format('전체 도감에서 %s 비중이 약 %s%%라 +1성이 붙었어요.', coat_name, round(global_coat_ratio * 100))
      );
    else
      reason_list := array_append(
        reason_list,
        format('전체 도감에서 %s 비중은 약 %s%%예요.', coat_name, round(global_coat_ratio * 100))
      );
    end if;
  else
    reason_list := array_append(reason_list, '전체 도감 표본이 더 쌓이면 전역 희소성도 반영돼요.');
  end if;

  -- 수집 마릿수는 보는 사람 기준이다(RLS가 본인 수집만 보여 준다).
  select count(*)
  into collected_count
  from public.user_cat_collections
  where user_cat_collections.user_id = auth.uid();

  rarity_cap := public.collector_rarity_cap(collected_count);
  raw_rarity := greatest(1, base_rarity + scarcity_bonus);
  final_rarity := least(rarity_cap, raw_rarity);

  if raw_rarity > final_rarity then
    reason_list := array_append(
      reason_list,
      format('지금 %s마리를 모아 최대 %s성까지 열려 있어요. 더 모으면 이 아이의 별도 올라가요.', collected_count, rarity_cap)
    );
  elsif rarity_cap < 5 then
    reason_list := array_append(
      reason_list,
      format('%s마리를 모아 최대 %s성까지 열려 있어요. 더 모으면 천장이 올라가요.', collected_count, rarity_cap)
    );
  end if;

  return query select final_rarity, reason_list;
end;
$$;

-- 상한이 올라갔을 때, 낮게 굳어 있던 별을 다시 매긴다.
-- 내 개체(cats.user_id)만 손댄다. 남의 개체를 내 수집 규모로 흔들면 같은
-- 고양이가 보는 사람마다 달라 보이고, RLS(cats_update_own)도 막는다.
create or replace function private.lift_collector_rarity_cap(p_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cat_row record;
  next_rarity integer;
  next_reasons text[];
begin
  for cat_row in
    select
      cats.id,
      cats.rarity,
      cats.coat_colors,
      cats.coat_pattern,
      (
        select regions.name
        from public.cat_regions
        join public.regions on regions.id = cat_regions.region_id
        where cat_regions.cat_id = cats.id
        order by cat_regions.first_seen_at
        limit 1
      ) as region_name
    from public.cats
    where cats.user_id = p_user_id
  loop
    select calculated.rarity, calculated.reasons
    into next_rarity, next_reasons
    from public.calculate_cat_rarity(cat_row.coat_colors, cat_row.coat_pattern, coalesce(cat_row.region_name, '')) as calculated;

    -- 올리기만 한다. 전역 비중은 도감이 커질수록 흔해지는 쪽으로 움직여서,
    -- 그대로 덮어쓰면 예전에 받은 별을 도로 빼앗게 된다.
    if next_rarity > cat_row.rarity then
      update public.cats
      set rarity = next_rarity,
          rarity_reasons = next_reasons
      where cats.id = cat_row.id;
    end if;
  end loop;
end;
$$;

create or replace function public.create_cat(
  p_name text,
  p_type text,
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
    type,
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
    p_type,
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
  -- 문턱을 넘는 순간에만 돈다. 매번 전체를 다시 매길 일은 아니다.
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

grant execute on function public.collector_rarity_cap(integer) to authenticated;
grant execute on function public.calculate_cat_rarity(text[], text, text) to authenticated;
grant execute on function private.lift_collector_rarity_cap(uuid) to authenticated;

-- 이미 매겨진 별은 내리지 않는다. 지금 도감에 4성이 하나 있는데 수집 7마리라
-- 상한(3성)과 어긋나지만, 줬던 별을 도로 빼앗는 쪽이 더 나쁘다.
-- 상한은 이번 마이그레이션 이후의 등록부터 적용된다.
