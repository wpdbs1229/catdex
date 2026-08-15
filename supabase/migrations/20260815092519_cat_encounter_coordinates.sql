-- 고양이를 실제로 만난 지점을 남긴다.
--
-- 지금까지 좌표는 구역(동네) 중심뿐이라 지도 발자국을 구역 중심에 흩어
-- 찍을 수밖에 없었다. 만남마다 지점을 남기고, 개체에는 마지막 지점을
-- 겹쳐 둔다. 화면은 이 점을 그대로 쓰지 않고 100m 안에서 흩어 보여준다.

alter table public.cat_encounters
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.cats
  add column if not exists last_seen_lat double precision,
  add column if not exists last_seen_lng double precision;

-- 기본값 인자를 덧붙이면 옛 시그니처와 겹쳐 호출이 모호해진다.
-- 옛 것을 지우고 다시 만든 뒤 실행 권한을 이전과 똑같이 맞춘다.

drop function public.create_cat(text, text[], text, text, text, text[], text, double precision, double precision, text, text);

create function public.create_cat(
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
  next_region_id text;
  calculated_rarity integer;
  calculated_reasons text[];
  collected_count integer;
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
$function$;

revoke all on function public.create_cat(text, text[], text, text, text, text[], text, double precision, double precision, text, text, double precision, double precision) from public;
grant execute on function public.create_cat(text, text[], text, text, text, text[], text, double precision, double precision, text, text, double precision, double precision) to authenticated, service_role;

drop function public.record_cat_encounter(uuid, text, text, text);
drop function private.record_cat_encounter_shared(uuid, text, text, text);

create function private.record_cat_encounter_shared(
  p_cat_id uuid,
  p_region_name text,
  p_memo text,
  p_image_url text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns public.cat_encounters
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  next_count integer;
  next_encounter public.cat_encounters;
  next_region_id text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_region_name is null or length(trim(p_region_name)) = 0 then
    raise exception 'Region name is required' using errcode = '22023';
  end if;

  update public.cats
  set
    encounter_count = encounter_count + 1,
    last_seen_at = current_date,
    -- 좌표를 못 읽은 만남이 마지막 지점을 지우면 안 된다.
    last_seen_lat = coalesce(p_lat, last_seen_lat),
    last_seen_lng = coalesce(p_lng, last_seen_lng),
    representative_photo_url = coalesce(representative_photo_url, p_image_url),
    image_url = coalesce(image_url, p_image_url)
  where id = p_cat_id
  returning encounter_count into next_count;

  if next_count is null then
    raise exception 'Cat not found' using errcode = 'P0002';
  end if;

  insert into public.cat_encounters (user_id, cat_id, seen_at, region_name, memo, image_url, lat, lng, location_precision, is_public)
  values (current_user_id, p_cat_id, current_date, p_region_name, coalesce(p_memo, ''), p_image_url, p_lat, p_lng, 'region', true)
  returning * into next_encounter;

  insert into public.user_cat_collections (user_id, cat_id, first_collected_at, last_seen_at, encounter_count)
  values (current_user_id, p_cat_id, current_date, current_date, 1)
  on conflict (user_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.user_cat_collections.encounter_count + 1,
    updated_at = now();

  next_region_id := private.ensure_region(p_region_name);

  insert into public.region_cats (region_id, cat_id, user_id)
  values (next_region_id, p_cat_id, current_user_id)
  on conflict do nothing;

  insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
  values (next_region_id, p_cat_id, current_date, current_date, 1)
  on conflict (region_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.cat_regions.encounter_count + 1,
    updated_at = now();

  if p_image_url is not null then
    insert into public.cat_photos (cat_id, encounter_id, uploaded_by, image_url, is_representative, visibility)
    values (p_cat_id, next_encounter.id, current_user_id, p_image_url, false, 'public');
  end if;

  return next_encounter;
end;
$function$;

revoke all on function private.record_cat_encounter_shared(uuid, text, text, text, double precision, double precision) from public;
grant execute on function private.record_cat_encounter_shared(uuid, text, text, text, double precision, double precision) to authenticated;

create function public.record_cat_encounter(
  p_cat_id uuid,
  p_region_name text,
  p_memo text,
  p_image_url text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns public.cat_encounters
language sql
set search_path to ''
as $function$
  select * from private.record_cat_encounter_shared(p_cat_id, p_region_name, p_memo, p_image_url, p_lat, p_lng);
$function$;
