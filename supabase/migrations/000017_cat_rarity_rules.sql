alter table public.cats
  add column if not exists rarity_reasons text[] not null default '{}';

update public.cats
set rarity_reasons = array[
  '기존에 등록된 고양이라 기본 희귀도 기록을 유지하고 있어요.',
  '새로 등록되는 고양이는 털색과 동네/전체 도감 분포를 함께 반영해요.'
]
where coalesce(array_length(rarity_reasons, 1), 0) = 0;

create or replace function public.cat_type_base_rarity(p_type text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when '치즈냥' then 2
    when '흰냥' then 2
    when '턱시도' then 3
    when '검은냥' then 3
    when '삼색이' then 4
    else 3
  end;
$$;

create or replace function public.calculate_cat_rarity(
  p_type text,
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
  base_rarity integer := public.cat_type_base_rarity(p_type);
  final_rarity integer;
  reason_list text[] := array[]::text[];
  target_region_id text;
  region_total_count integer := 0;
  region_type_count integer := 0;
  global_total_count integer := 0;
  global_type_count integer := 0;
  global_type_ratio numeric := 0;
  scarcity_bonus integer := 0;
begin
  reason_list := array_append(reason_list, format('%s 기본 희귀도 %s성으로 시작했어요.', p_type, base_rarity));

  select regions.id
  into target_region_id
  from public.regions
  where regions.name = trim(p_region_name)
  limit 1;

  if target_region_id is not null then
    select count(distinct cat_regions.cat_id)
    into region_total_count
    from public.cat_regions
    where cat_regions.region_id = target_region_id;

    select count(distinct cats.id)
    into region_type_count
    from public.cat_regions
    join public.cats on cats.id = cat_regions.cat_id
    where cat_regions.region_id = target_region_id
      and cats.type = p_type;

    if region_total_count >= 3 and region_type_count = 0 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(reason_list, format('%s에서 아직 %s 기록이 없어 +1성이 붙었어요.', trim(p_region_name), p_type));
    elsif region_total_count >= 8 and region_type_count <= 1 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(reason_list, format('%s에서 %s 기록이 드문 편이라 +1성이 붙었어요.', trim(p_region_name), p_type));
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
  into global_type_count
  from public.cats
  where cats.type = p_type;

  if global_total_count >= 10 then
    global_type_ratio := global_type_count::numeric / global_total_count::numeric;

    if global_type_ratio < 0.12 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(
        reason_list,
        format('전체 도감에서 %s 비중이 약 %s%%라 +1성이 붙었어요.', p_type, round(global_type_ratio * 100))
      );
    else
      reason_list := array_append(
        reason_list,
        format('전체 도감에서 %s 비중은 약 %s%%예요.', p_type, round(global_type_ratio * 100))
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

create or replace function public.create_cat(
  p_name text,
  p_type text,
  p_tags text[],
  p_region_name text,
  p_memo text,
  p_image_url text default null
)
returns public.cats
language plpgsql
security invoker
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
  from public.calculate_cat_rarity(p_type, p_region_name) as calculated;

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
    rarity,
    rarity_reasons,
    encounter_count,
    first_seen_at,
    last_seen_at,
    relationship_level,
    tags,
    memo,
    image_url,
    representative_photo_url
  )
  values (
    current_user_id,
    current_user_id,
    next_number,
    trim(p_name),
    p_type,
    calculated_rarity,
    coalesce(calculated_reasons, '{}'::text[]),
    1,
    current_date,
    current_date,
    public.cat_relationship_level(1),
    coalesce(p_tags, '{}'),
    nullif(trim(coalesce(p_memo, '')), ''),
    p_image_url,
    p_image_url
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

  next_region_id := private.ensure_region(p_region_name);

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
    values (next_cat.id, next_encounter.id, current_user_id, p_image_url, true, 'public');
  end if;

  return next_cat;
end;
$$;

grant execute on function public.cat_type_base_rarity(text) to authenticated;
grant execute on function public.calculate_cat_rarity(text, text) to authenticated;
