-- 새로 만들어지는 동네의 좌표를 실제 동네 중심으로 받는다.
--
-- private.ensure_region은 새 구역을 만들 때 좌표를 (37.5, 126.76)으로 박아 넣었다.
-- 부천의 한 지점이다. 그래서 사용자가 만든 동네가 전부 같은 자리에 겹쳤고,
-- 운영 DB에도 '역삼동'과 '동네 미지정'이 그 좌표에 쌓여 있다. 고객 지도에서
-- 서로 다른 동네가 한 점에 뭉쳐 보이는 원인이다.
--
-- 좌표는 클라이언트가 동네 이름을 정방향 지오코딩해서 얻은 "동네 중심"이다.
-- 사용자의 실제 위치가 아니다(지오코딩 실패 시에도 500m 격자로 뭉갠 값만 온다).
-- 정확한 위도·경도를 저장하지 않는다는 원칙은 그대로다.

-- 하드코딩 좌표로 만들어진 행을 나중에 알아볼 수 있게 표시해 둔다.
alter table public.regions
  add column if not exists is_placeholder_location boolean not null default false;

comment on column public.regions.is_placeholder_location is
  '좌표를 못 받아 기본값으로 만든 구역. 진짜 좌표가 들어오면 false로 바뀐다.';

-- 기존 하드코딩 좌표 행을 표시한다. 값 자체는 건드리지 않는다.
update public.regions
set is_placeholder_location = true
where lat = 37.5 and lng = 126.76;

create or replace function private.ensure_region(
  region_name text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_region_id text;
  has_coords boolean := p_lat is not null and p_lng is not null
    and p_lat between -90 and 90 and p_lng between -180 and 180;
begin
  select id into next_region_id
  from public.regions
  where name = region_name;

  if next_region_id is null then
    next_region_id := public.slugify_region_name(region_name);

    insert into public.regions (id, name, lat, lng, radius, is_placeholder_location)
    values (
      next_region_id,
      region_name,
      coalesce(p_lat, 37.5),
      coalesce(p_lng, 126.76),
      350,
      not has_coords
    )
    on conflict (name) do update set name = excluded.name
    returning id into next_region_id;

  elsif has_coords then
    -- 기본 좌표로 만들어진 구역은 진짜 좌표가 처음 들어올 때 스스로 고친다.
    -- 이미 제대로 된 좌표가 있으면 덮어쓰지 않는다. 먼저 기록한 값이 기준이다.
    update public.regions
    set lat = p_lat, lng = p_lng, is_placeholder_location = false
    where id = next_region_id
      and is_placeholder_location;
  end if;

  return next_region_id;
end;
$$;

-- 기본값이 붙은 새 시그니처가 옛 1인자 호출과 모호해지므로 옛 것을 지운다.
drop function if exists private.ensure_region(text);

grant execute on function private.ensure_region(text, double precision, double precision) to authenticated;


-- create_cat이 동네 좌표를 받아 ensure_region에 넘긴다.
-- 기본값을 준 인자를 덧붙이면 8인자 호출이 옛 함수와 모호해지므로 옛 것을 먼저 지운다.
drop function if exists public.create_cat(text, text, text[], text, text, text, text[], text);

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
  p_region_lng double precision default null
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
    representative_photo_url
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
    values (next_cat.id, next_encounter.id, current_user_id, p_image_url, true, 'public');
  end if;

  return next_cat;
end;
$$;

revoke all on function public.create_cat(text, text, text[], text, text, text, text[], text, double precision, double precision) from public;
revoke execute on function public.create_cat(text, text, text[], text, text, text, text[], text, double precision, double precision) from anon;
grant execute on function public.create_cat(text, text, text[], text, text, text, text[], text, double precision, double precision) to authenticated;
