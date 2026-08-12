-- 희귀도 산정을 cats.type이 아니라 컬러·패턴에서 직접 뽑는다.
--
-- 000017의 cat_type_base_rarity는 deriveCatType이 접어 놓은 한국어 분류를 읽었다.
-- type은 여러 조합을 한 이름으로 뭉치는 단방향 값이라(치즈냥 = orange/cream ×
-- tabby/solid) 희귀도의 근거로 삼기에 성기다. 등록 화면이 이미 원본 두 축을
-- 저장하므로 그 두 축으로 옮긴다.
--
-- 기준표 (base = 패턴 기본값 + 희귀색 가산, 최대 4)
--
--   패턴   태비 2 · 원톤 3 · 투톤 3 · 토티 4 · 미상 3
--   색     검정·회색·갈색·주황·흰색 +0
--          크림·초콜릿·시나몬·라일락 +1   (고른 색 중 하나만 해당해도 붙는다)
--
-- 태비가 가장 흔한 길고양이 무늬라 2성, 토티(삼색·카오스)는 성염색체 때문에
-- 실제로 드물어 4성이다. 옛 표와 견주면 삼색이 4 · 치즈냥 2 · 검은냥 3 ·
-- 턱시도 3 · 회색냥 3 · 젖소냥 3은 그대로고, 흰냥 2→3 · 카오스 3→4가 오르고
-- 고등어냥·갈색태비 3→2가 내린다. 옛 표의 "그 외 3"이 뭉개던 자리다.
--
-- 동네·전역 희소성 가산(+1씩)은 규칙 그대로 두고 비교 기준만 type에서
-- "같은 패턴이면서 색이 하나라도 겹치는 개체"로 바꾼다.

create or replace function public.coat_label(p_colors text[], p_pattern text)
returns text
language sql
immutable
set search_path = ''
as $$
  with color_labels as (
    select string_agg(
      case color
        when 'black' then '검정'
        when 'gray' then '회색'
        when 'brown' then '갈색'
        when 'chocolate' then '초콜릿'
        when 'cinnamon' then '시나몬'
        when 'orange' then '주황'
        when 'cream' then '크림'
        when 'lilac' then '라일락'
        when 'white' then '흰색'
        else color
      end,
      '·' order by ordinality
    ) as text
    from unnest(coalesce(p_colors, '{}'::text[])) with ordinality as colors(color, ordinality)
  )
  select coalesce(
    nullif(
      trim(
        concat_ws(
          ' ',
          (select text from color_labels),
          case p_pattern
            when 'solid' then '원톤'
            when 'bicolor' then '투톤'
            when 'tabby' then '태비'
            when 'tortie' then '토티'
            else null
          end
        )
      ),
      ''
    ),
    '털색 미상'
  );
$$;

comment on function public.coat_label(text[], text) is
  '컬러·패턴을 사람이 읽는 한 줄로 만든다. 예: 주황 태비. 희귀도 사유 문구가 쓴다.';

create or replace function public.coat_base_rarity(p_colors text[], p_pattern text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(
    4,
    case p_pattern
      when 'tabby' then 2
      when 'solid' then 3
      when 'bicolor' then 3
      when 'tortie' then 4
      else 3
    end
    + case
        when coalesce(p_colors, '{}'::text[])
          && array['cream', 'chocolate', 'cinnamon', 'lilac']::text[]
        then 1
        else 0
      end
  );
$$;

comment on function public.coat_base_rarity(text[], text) is
  '컬러·패턴 기준 기본 희귀도(1~4). 동네·전역 희소성 가산 전의 값이다.';

drop function if exists public.calculate_cat_rarity(text, text);
drop function if exists public.cat_type_base_rarity(text);

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
  final_rarity integer;
  reason_list text[] := array[]::text[];
  v_region_id text;
  region_total_count integer := 0;
  region_coat_count integer := 0;
  global_total_count integer := 0;
  global_coat_count integer := 0;
  global_coat_ratio numeric := 0;
  scarcity_bonus integer := 0;
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

  final_rarity := greatest(1, least(5, base_rarity + scarcity_bonus));

  if final_rarity = 5 and base_rarity + scarcity_bonus > 5 then
    reason_list := array_append(reason_list, '희귀도는 최대 5성까지만 표시돼요.');
  end if;

  return query select final_rarity, reason_list;
end;
$$;

-- create_cat은 아직 p_type을 받아 cats.type에 넣는다(표시용). 희귀도만 컬러·패턴에서 뽑는다.
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

  return next_cat;
end;
$$;

-- 이미 등록된 개체도 새 기준으로 다시 매긴다. 옛 사유 문구가 type을 부르고 있어
-- 그대로 두면 화면에서 근거와 별 개수가 어긋난다.
do $$
declare
  cat_row record;
  next_rarity integer;
  next_reasons text[];
begin
  for cat_row in
    select
      cats.id,
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
  loop
    select calculated.rarity, calculated.reasons
    into next_rarity, next_reasons
    from public.calculate_cat_rarity(cat_row.coat_colors, cat_row.coat_pattern, coalesce(cat_row.region_name, '')) as calculated;

    update public.cats
    set rarity = next_rarity,
        rarity_reasons = next_reasons
    where cats.id = cat_row.id;
  end loop;
end;
$$;

grant execute on function public.coat_label(text[], text) to authenticated;
grant execute on function public.coat_base_rarity(text[], text) to authenticated;
grant execute on function public.calculate_cat_rarity(text[], text, text) to authenticated;
