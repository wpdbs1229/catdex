-- 원본 사진과 누끼를 따로 저장한다.
--
-- create_cat이 누끼 경로를 image_url과 representative_photo_url 양쪽에 같은
-- 값으로 넣고 있었다. 그래서 고양이 단위로는 원본 사진이 남지 않는다.
-- 원본은 cat_observations.original_image_url에만 있는데, 관찰은 확정 후에도
-- 보존되지만 고양이에서 곧바로 짚어 가기 어렵다.
--
-- image_url의 의미(대표 이미지 = 누끼)는 그대로 둔다. 여기를 원본으로 바꾸면
-- 누끼를 전제로 contain 렌더링하는 화면들이 전부 사각 사진으로 바뀐다.
-- 원본을 담을 자리를 새로 만드는 쪽이 안전하다.

alter table public.cats
  add column if not exists original_photo_url text;

comment on column public.cats.image_url is
  '대표 이미지. 촬영 흐름에서는 배경을 지운 누끼(PNG)가 들어온다.';
comment on column public.cats.original_photo_url is
  '누끼를 만들기 전의 원본 사진. 없을 수 있다(데모 데이터, 옛 기록).';

-- 기존 고양이의 원본을 관찰 기록에서 되찾는다.
-- 확정된 관찰(resolved_cat_id)이 원본과 누끼를 모두 들고 있다.
update public.cats
set original_photo_url = recovered.original_image_url
from (
  select distinct on (observations.resolved_cat_id)
    observations.resolved_cat_id as cat_id,
    observations.original_image_url
  from public.cat_observations observations
  where observations.resolved_cat_id is not null
    and observations.original_image_url is not null
  order by observations.resolved_cat_id, observations.created_at desc
) as recovered
where public.cats.id = recovered.cat_id
  and public.cats.original_photo_url is null;

-- create_cat이 원본 경로를 함께 받는다.
-- 기본값을 준 인자를 덧붙이면 10인자 호출이 옛 함수와 모호해지므로 먼저 지운다.
drop function if exists public.create_cat(text, text, text[], text, text, text, text[], text, double precision, double precision);

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

revoke all on function public.create_cat(text, text, text[], text, text, text, text[], text, double precision, double precision, text) from public;
revoke execute on function public.create_cat(text, text, text[], text, text, text, text[], text, double precision, double precision, text) from anon;
grant execute on function public.create_cat(text, text, text[], text, text, text, text[], text, double precision, double precision, text) to authenticated;
