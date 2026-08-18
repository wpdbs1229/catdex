-- 희귀도에서 수집가 상한을 제거한다.
--
-- 예전에는 최초 등록자의 수집 마릿수(10/30마리)에 따라 3~5성 상한이 걸렸다.
-- 같은 고객을 지부 도감과 내 고객 도감에서 함께 보여주는 지금 구조에서는
-- 개인 진행도가 공용 고객 값에 섞여, 누가 먼저 등록했는지에 따라 희귀도가 달라진다.
-- 개인 상한과 승급 보정을 제거해 어느 화면·사용자에게나 같은 값을 돌려준다.
--
-- create_cat은 main의 최신 정의(고양이 이름 투표 포함)를 기준으로 두고 상한
-- 관련 코드만 걷어냈다. 이 작업의 원래 작성분은 이름 투표 이전 버전을 담고 있어
-- 그대로 적용하면 투표 기능이 사라진다.

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
security invoker
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

    select count(distinct cats.id)
    into region_coat_count
    from public.cat_regions
    join public.cats on cats.id = cat_regions.cat_id
    where cat_regions.region_id = v_region_id
      and (p_coat_pattern is null or cats.coat_pattern is not distinct from p_coat_pattern)
      and (coalesce(array_length(v_coat_colors, 1), 0) = 0 or cats.coat_colors && v_coat_colors);

    if region_total_count >= 3 and region_coat_count = 0 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(
        reason_list,
        format('%s에서 아직 %s 기록이 없어 +1성이 붙었어요.', trim(p_region_name), coat_name)
      );
    elsif region_total_count >= 8 and region_coat_count <= 1 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(
        reason_list,
        format('%s에서 %s 기록이 드문 편이라 +1성이 붙었어요.', trim(p_region_name), coat_name)
      );
    else
      reason_list := array_append(
        reason_list,
        format('%s의 기존 발견 분포도 함께 확인했어요.', trim(p_region_name))
      );
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

  if base_rarity + scarcity_bonus > 5 then
    reason_list := array_append(reason_list, '희귀도는 최대 5성까지만 표시돼요.');
  end if;

  return query select final_rarity, reason_list;
end;
$$;

comment on function public.calculate_cat_rarity(text[], text, text) is
  '털색·무늬와 지부/전체 발견 분포로 정하는 공용 희귀도. 수집자별 상한은 적용하지 않는다.';

revoke all on function public.calculate_cat_rarity(text[], text, text) from public;
revoke execute on function public.calculate_cat_rarity(text[], text, text) from anon;
grant execute on function public.calculate_cat_rarity(text[], text, text) to authenticated, service_role;

-- 최신 create_cat 시그니처를 유지하되, 10/30마리 문턱에서 예전 고객을 다시
-- 올리던 개인 상한 코드를 제거한다. 새 고객은 계산된 공용 희귀도를 그대로 쓴다.

-- 이름 투표를 포함한 최신 create_cat에서 상한 승급 블록만 제거한다.
create or replace function public.create_cat(
  p_name text,
  p_tags text[],
  p_region_name text,
  p_memo text,
  p_image_url text default null,
  p_coat_colors text[] default '{}'::text[],
  p_coat_pattern text default null,
  p_region_lat double precision default null,
  p_region_lng double precision default null,
  p_original_photo_url text default null,
  p_habitat text default 'street',
  p_lat double precision default null,
  p_lng double precision default null
)
returns public.cats
language plpgsql
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  next_number integer;
  next_cat public.cats;
  next_encounter public.cat_encounters;
  next_name_proposal public.cat_name_proposals;
  next_region_id text;
  calculated_rarity integer;
  calculated_reasons text[];
  chosen_habitat text := coalesce(nullif(trim(p_habitat), ''), 'street');
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

  if chosen_habitat not in ('house', 'street', 'shelter') then
    raise exception '알 수 없는 거처예요' using errcode = '22023';
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
    habitat,
    rarity,
    rarity_reasons,
    encounter_count,
    first_seen_at,
    last_seen_at,
    last_seen_lat,
    last_seen_lng,
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
    chosen_habitat,
    calculated_rarity,
    coalesce(calculated_reasons, '{}'::text[]),
    1,
    current_date,
    current_date,
    p_lat,
    p_lng,
    coalesce(p_tags, '{}'),
    nullif(trim(coalesce(p_memo, '')), ''),
    p_image_url,
    p_image_url,
    p_original_photo_url
  )
  returning * into next_cat;

  -- 등록한 이름을 후보 #1로 심고, 등록자가 그 이름에 첫 표를 던진다.
  insert into public.cat_name_proposals (cat_id, name, proposed_by)
  values (next_cat.id, next_cat.name, current_user_id)
  returning * into next_name_proposal;

  insert into public.cat_name_votes (cat_id, user_id, proposal_id)
  values (next_cat.id, current_user_id, next_name_proposal.id);

  update public.cats set active_name_proposal_id = next_name_proposal.id where id = next_cat.id;
  next_cat.active_name_proposal_id := next_name_proposal.id;

  insert into public.cat_encounters (user_id, cat_id, seen_at, region_name, memo, image_url, lat, lng, location_precision, is_public)
  values (current_user_id, next_cat.id, current_date, p_region_name, coalesce(p_memo, ''), p_image_url, p_lat, p_lng, 'region', true)
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
$function$;

revoke all on function public.create_cat(
  text,
  text[],
  text,
  text,
  text,
  text[],
  text,
  double precision,
  double precision,
  text,
  text,
  double precision,
  double precision
) from public;
revoke execute on function public.create_cat(
  text,
  text[],
  text,
  text,
  text,
  text[],
  text,
  double precision,
  double precision,
  text,
  text,
  double precision,
  double precision
) from anon;
grant execute on function public.create_cat(
  text,
  text[],
  text,
  text,
  text,
  text[],
  text,
  double precision,
  double precision,
  text,
  text,
  double precision,
  double precision
) to authenticated, service_role;

-- 상한 때문에 낮게 저장된 기존 고객은 올리되, 이미 받은 별은 다시 내리지 않는다.
-- 사유도 새 계산 결과로 바꿔 개인 수집 마릿수 문구가 남지 않게 한다.
with recalculated as (
  select
    cats.id,
    cats.rarity as previous_rarity,
    calculated.rarity as next_rarity,
    calculated.reasons as next_reasons
  from public.cats cats
  left join lateral (
    select regions.name
    from public.cat_regions
    join public.regions on regions.id = cat_regions.region_id
    where cat_regions.cat_id = cats.id
    order by cat_regions.first_seen_at, regions.name
    limit 1
  ) first_region on true
  cross join lateral public.calculate_cat_rarity(
    cats.coat_colors,
    cats.coat_pattern,
    coalesce(first_region.name, '')
  ) calculated
)
update public.cats cats
set
  rarity = greatest(recalculated.previous_rarity, recalculated.next_rarity),
  rarity_reasons = case
    when recalculated.next_rarity >= recalculated.previous_rarity then recalculated.next_reasons
    else array_append(
      recalculated.next_reasons,
      format('등록 당시 확정된 희귀도 %s성은 그대로 유지했어요.', recalculated.previous_rarity)
    )
  end
from recalculated
where cats.id = recalculated.id;

drop function if exists private.lift_collector_rarity_cap(uuid);
drop function if exists public.collector_rarity_cap(integer);

