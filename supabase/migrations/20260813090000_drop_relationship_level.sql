-- 관계 레벨 체계 제거
--
-- '첫 만남 / 살짝 경계 중 / 동네 친구 / 골목 대장' 등급은 만난 횟수를 네 칸으로
-- 접어놓은 값일 뿐이라 encounter_count 말고는 아무것도 담고 있지 않았다.
-- 같은 사실을 두 컬럼이 말하다 보니 둘이 어긋나면 어느 쪽이 진짜인지 알 수 없고,
-- cats.relationship_level은 전체 사용자 합산 기준이라 "발견 횟수 5회 · 골목 대장"
-- 처럼 내 기록과 짝이 안 맞게 보이기도 했다.
--
-- 관계는 이제 클라이언트가 만난 횟수에서 바로 그리는 친밀도 게이지 하나로만
-- 표현한다. 사라지는 정보는 없다 - 등급은 encounter_count에서 언제든 다시 접을 수 있다.

create or replace function private.recalculate_cat_stats(p_cat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_first date;
  v_last date;
begin
  select count(*), min(seen_at), max(seen_at)
  into v_count, v_first, v_last
  from public.cat_encounters
  where cat_id = p_cat_id;

  if coalesce(v_count, 0) = 0 then
    -- 만남이 없는 개체의 삭제 여부는 호출자가 결정한다.
    return;
  end if;

  update public.cats
  set
    encounter_count = v_count,
    first_seen_at = v_first,
    last_seen_at = v_last
  where id = p_cat_id;
end;
$$;

revoke all on function private.recalculate_cat_stats(uuid) from public, anon, authenticated;

create or replace function private.record_cat_encounter_shared(
  p_cat_id uuid,
  p_region_name text,
  p_memo text,
  p_image_url text default null
)
returns public.cat_encounters
language plpgsql
security definer
set search_path = ''
as $$
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
    representative_photo_url = coalesce(representative_photo_url, p_image_url),
    image_url = coalesce(image_url, p_image_url)
  where id = p_cat_id
  returning encounter_count into next_count;

  if next_count is null then
    raise exception 'Cat not found' using errcode = 'P0002';
  end if;

  insert into public.cat_encounters (user_id, cat_id, seen_at, region_name, memo, image_url, location_precision, is_public)
  values (current_user_id, p_cat_id, current_date, p_region_name, coalesce(p_memo, ''), p_image_url, 'region', true)
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
$$;

-- record_cat_encounter_shared의 실행 권한은 건드리지 않는다.
-- authenticated가 직접 호출하는 경로가 있어 revoke하면 재회 기록이 막힌다.

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

alter table public.cats drop column if exists relationship_level;

drop function if exists public.cat_relationship_level(integer);
