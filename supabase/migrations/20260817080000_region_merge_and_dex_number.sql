-- 구역 통합 + 구역별 도감 번호.
--
-- 같은 동네가 이름 표기만 달라 여러 구역으로 쪼개져 있었다('중동'과
-- '부천시 중동 근처'). 지부 도감이 이름 유사 매칭으로 억지로 합쳐 보여주던
-- 것을 서버에서 정리한다:
--  1) 정규화 이름이 같은 구역들을 하나로 병합하고, 흡수된 행은 merged_into로
--     남겨 옛 이름 조회가 대표 구역으로 이어지게 한다.
--  2) ensure_region이 새 이름을 만들기 전에 정규화 이름으로 기존 구역을
--     찾아, 앞으로는 파편이 생기지 않게 한다.
--  3) cat_regions에 구역별 도감 번호(dex_number)를 붙인다. 구역 안에서
--     1번부터 차곡차곡, 한 번 받은 번호는 바뀌지 않는다(결번 허용).

-- 흡수된 구역이 대표 구역을 가리킨다. null이면 스스로가 대표다.
alter table public.regions
  add column if not exists merged_into text references public.regions(id);

comment on column public.regions.merged_into is
  '같은 동네의 다른 표기로 판정돼 흡수된 구역이 가리키는 대표 구역. null이면 대표.';

-- 클라이언트 normalizeNeighborhoodNameForMatch(neighborhood-match.ts)와 같은
-- 규칙이어야 한다. 법정동 단위로 견주고, "태평로1가"의 가 번호는 떼지 않는다.
create or replace function private.normalize_region_name(p_name text)
returns text
language plpgsql
immutable
set search_path to ''
as $$
declare
  pattern constant text := '([가-힣0-9]+(?:동[0-9]+가|동|읍|면|리|가))';
  cleaned text := trim(regexp_replace(regexp_replace(coalesce(p_name, ''), '근처', ' ', 'g'), '[()]', ' ', 'g'));
  parts text[] := regexp_split_to_array(cleaned, '[\s,·/|>-]+');
  part text;
  found text[];
  compact text;
begin
  for i in reverse coalesce(array_length(parts, 1), 0)..1 loop
    part := trim(parts[i]);

    if part = '' then
      continue;
    end if;

    select array_agg(m[1]) into found from regexp_matches(part, pattern, 'g') m;

    if found is not null and array_length(found, 1) > 0 then
      return found[array_length(found, 1)];
    end if;
  end loop;

  compact := regexp_replace(cleaned, '\s+', '', 'g');

  select array_agg(m[1]) into found from regexp_matches(compact, pattern, 'g') m;

  if found is null or array_length(found, 1) = 0 then
    return compact;
  end if;

  return found[array_length(found, 1)];
end;
$$;

-- 기존 파편 병합. 정규화 이름이 같은 구역 무리마다 기록이 가장 많은 쪽을
-- 대표로 삼고, 나머지의 cat_regions·region_cats를 대표로 옮긴다.
do $$
declare
  duplicate record;
  canonical_id text;
begin
  for duplicate in
    select r.id, r.normalized
    from (
      select id, private.normalize_region_name(name) as normalized,
        (select count(*) from public.cat_regions cr where cr.region_id = regions.id) as cat_count,
        is_placeholder_location, created_at
      from public.regions
      where merged_into is null
    ) r
    where exists (
      select 1
      from public.regions other
      where other.merged_into is null
        and other.id <> r.id
        and private.normalize_region_name(other.name) = r.normalized
        and (
          (select count(*) from public.cat_regions cr where cr.region_id = other.id) > r.cat_count
          -- 기록 수가 같으면 실좌표 > 기본좌표, 그다음 먼저 만든 쪽이 대표.
          or ((select count(*) from public.cat_regions cr where cr.region_id = other.id) = r.cat_count
              and (other.is_placeholder_location, other.created_at) < (r.is_placeholder_location, r.created_at))
        )
    )
  loop
    select id into canonical_id
    from public.regions other
    where other.merged_into is null
      and other.id <> duplicate.id
      and private.normalize_region_name(other.name) = duplicate.normalized
    order by (select count(*) from public.cat_regions cr where cr.region_id = other.id) desc,
      is_placeholder_location asc, created_at asc
    limit 1;

    insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
    select canonical_id, cat_id, first_seen_at, last_seen_at, encounter_count
    from public.cat_regions
    where region_id = duplicate.id
    on conflict (region_id, cat_id) do update set
      first_seen_at = least(public.cat_regions.first_seen_at, excluded.first_seen_at),
      last_seen_at = greatest(public.cat_regions.last_seen_at, excluded.last_seen_at),
      encounter_count = public.cat_regions.encounter_count + excluded.encounter_count,
      updated_at = now();

    delete from public.cat_regions where region_id = duplicate.id;

    insert into public.region_cats (region_id, cat_id, user_id)
    select canonical_id, cat_id, user_id
    from public.region_cats
    where region_id = duplicate.id
    on conflict do nothing;

    delete from public.region_cats where region_id = duplicate.id;

    update public.regions set merged_into = canonical_id where id = duplicate.id;
  end loop;
end;
$$;

-- ensure_region: 이름이 정확히 같은 구역(흡수된 것 포함) -> 정규화 이름이
-- 같은 대표 구역 -> 그래도 없으면 새로 만든다.
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
  resolved_merge text;
  has_coords boolean := p_lat is not null and p_lng is not null
    and p_lat between -90 and 90 and p_lng between -180 and 180;
begin
  select id, merged_into into next_region_id, resolved_merge
  from public.regions
  where name = region_name;

  if next_region_id is not null and resolved_merge is not null then
    next_region_id := resolved_merge;
  end if;

  if next_region_id is null then
    -- 표기만 다른 같은 동네가 이미 있으면 그 구역을 쓴다. 파편 재발 방지.
    select id into next_region_id
    from public.regions
    where merged_into is null
      and private.normalize_region_name(name) = private.normalize_region_name(region_name)
    order by created_at
    limit 1;
  end if;

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

-- 구역별 도감 번호. 구역에 처음 기록되는 순서대로 1번부터 받고, 개체가
-- 정리돼도 번호는 재사용하지 않는다(결번).
alter table public.cat_regions add column if not exists dex_number integer;

with numbered as (
  select region_id, cat_id,
    row_number() over (partition by region_id order by first_seen_at, created_at) as rn
  from public.cat_regions
  where dex_number is null
)
update public.cat_regions cr
set dex_number = numbered.rn
from numbered
where cr.region_id = numbered.region_id and cr.cat_id = numbered.cat_id;

alter table public.cat_regions alter column dex_number set not null;
create unique index if not exists cat_regions_region_dex_number on public.cat_regions (region_id, dex_number);

create or replace function private.assign_region_dex_number()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.dex_number is null then
    -- 같은 구역에 동시 등록돼도 번호가 겹치지 않게 구역 단위로 잠근다.
    perform pg_advisory_xact_lock(hashtext('region_dex_' || new.region_id));

    select coalesce(max(dex_number), 0) + 1
    into new.dex_number
    from public.cat_regions
    where region_id = new.region_id;
  end if;

  return new;
end;
$$;

drop trigger if exists assign_region_dex_number on public.cat_regions;

create trigger assign_region_dex_number
  before insert on public.cat_regions
  for each row
  execute function private.assign_region_dex_number();
