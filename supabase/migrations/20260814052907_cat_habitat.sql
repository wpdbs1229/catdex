-- 고양이가 어디서 사는지: 집냥이 / 길냥이 / 보호소냥이
--
-- 털색·무늬처럼 사진에서 유도할 수 있는 값이 아니라, 사람이 알고 골라야 하는
-- 독립된 사실이다. 그래서 저장한다. (cats.type을 지운 것과 반대되는 판단처럼
-- 보이지만, 그건 컬러·무늬에서 기계적으로 나오는 값을 굳이 복사해둔 것이라
-- 원본과 어긋났던 경우다.)
--
-- 값은 컬러·무늬와 같은 방식으로 영문 id를 쓰고 한국어 라벨은 화면이 붙인다.
-- 한국어를 데이터로 두면 문구를 다듬을 때마다 마이그레이션이 필요하다.
--
-- 모든 사용자가 함께 보는 값이다. 등록한 사람이 정하고, 이후에는 바뀌지 않는다.

alter table public.cats
  add column if not exists habitat text not null default 'street';

alter table public.cats
  drop constraint if exists cats_habitat_check;

alter table public.cats
  add constraint cats_habitat_check check (habitat in ('house', 'street', 'shelter'));

-- 이미 있던 개체는 전부 길냥이로 둔다. 길고양이 도감이라 가장 사실에 가깝지만
-- 어디까지나 추정이다. 등록할 때 고르게 된 뒤로는 추정이 섞이지 않는다.
comment on column public.cats.habitat is
  '집냥이(house)/길냥이(street)/보호소냥이(shelter). 등록자가 고르는 공유값.';

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
  p_original_photo_url text default null,
  p_habitat text default 'street'
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
