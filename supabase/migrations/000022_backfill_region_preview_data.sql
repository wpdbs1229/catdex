-- Backfill regional display rows and cat preview aggregates from existing
-- encounter records.
--
-- This migration intentionally uses only cat_encounters.region_name. It does
-- not introduce exact GPS/EXIF coordinates. Known regions use coarse display
-- centers, and any historical region that is not in the seed list receives a
-- deterministic coarse fallback with a larger radius so old data can still be
-- rendered without collapsing every marker onto the app's default coordinate.

with known_regions (id, name, lat, lng, radius) as (
  values
    ('jung-dong', '부천시 중동 근처', 37.5035::double precision, 126.766::double precision, 350),
    ('sang-dong', '부천시 상동 근처', 37.5058::double precision, 126.753::double precision, 400),
    ('songnae-dong', '부천시 송내동 근처', 37.4873::double precision, 126.7536::double precision, 300)
)
insert into public.regions (id, name, lat, lng, radius)
select id, name, lat, lng, radius
from known_regions
on conflict (id) do update set
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  radius = greatest(public.regions.radius, excluded.radius);

with encounter_region_names as (
  select distinct trim(region_name) as name
  from public.cat_encounters
  where region_name is not null
    and length(trim(region_name)) > 0
),
known_regions (name) as (
  values
    ('부천시 중동 근처'),
    ('부천시 상동 근처'),
    ('부천시 송내동 근처')
),
dynamic_regions as (
  select
    public.slugify_region_name(ern.name) as base_id,
    ern.name,
    round(
      (
        37.5
        + (((abs(hashtext(ern.name)::bigint) % 900) - 450)::double precision / 100000.0)
      )::numeric,
      6
    )::double precision as lat,
    round(
      (
        126.76
        + (((abs(hashtext('lng:' || ern.name)::bigint) % 900) - 450)::double precision / 100000.0)
      )::numeric,
      6
    )::double precision as lng,
    900 as radius
  from encounter_region_names ern
  left join known_regions kr on kr.name = ern.name
  left join public.regions existing_region on existing_region.name = ern.name
  where kr.name is null
    and existing_region.id is null
),
numbered_dynamic_regions as (
  select
    dynamic_regions.*,
    row_number() over (partition by base_id order by name) as id_rank
  from dynamic_regions
),
insertable_dynamic_regions as (
  select
    case
      when id_rank > 1
        or exists (
          select 1
          from public.regions existing_region
          where existing_region.id = numbered_dynamic_regions.base_id
            and existing_region.name <> numbered_dynamic_regions.name
        )
      then numbered_dynamic_regions.base_id || '-' || substr(md5(numbered_dynamic_regions.name), 1, 8)
      else numbered_dynamic_regions.base_id
    end as id,
    name,
    lat,
    lng,
    radius
  from numbered_dynamic_regions
)
insert into public.regions (id, name, lat, lng, radius)
select id, name, lat, lng, radius
from insertable_dynamic_regions
on conflict (id) do update set
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  radius = greatest(public.regions.radius, excluded.radius);

with encounter_region_cats as (
  select
    regions.id as region_id,
    encounters.cat_id,
    min(encounters.seen_at) as first_seen_at,
    max(encounters.seen_at) as last_seen_at,
    count(*)::integer as encounter_count
  from public.cat_encounters encounters
  join public.regions regions
    on regions.name = trim(encounters.region_name)
  where encounters.region_name is not null
    and length(trim(encounters.region_name)) > 0
    and coalesce(encounters.is_public, true)
  group by regions.id, encounters.cat_id
)
insert into public.cat_regions (
  region_id,
  cat_id,
  first_seen_at,
  last_seen_at,
  encounter_count
)
select
  region_id,
  cat_id,
  first_seen_at,
  last_seen_at,
  encounter_count
from encounter_region_cats
on conflict (region_id, cat_id) do update set
  first_seen_at = least(public.cat_regions.first_seen_at, excluded.first_seen_at),
  last_seen_at = greatest(public.cat_regions.last_seen_at, excluded.last_seen_at),
  encounter_count = excluded.encounter_count,
  updated_at = now();

-- Keep the legacy region_cats table minimally populated for older code paths.
-- Its current primary key is (region_id, cat_id), so it can retain only one
-- user per region-cat pair; the current app uses cat_encounters/cat_regions
-- instead for personal and shared map views.
with first_region_cat_owner as (
  select distinct on (regions.id, encounters.cat_id)
    regions.id as region_id,
    encounters.cat_id,
    encounters.user_id
  from public.cat_encounters encounters
  join public.regions regions
    on regions.name = trim(encounters.region_name)
  where encounters.region_name is not null
    and length(trim(encounters.region_name)) > 0
  order by regions.id, encounters.cat_id, encounters.seen_at asc, encounters.created_at asc
)
insert into public.region_cats (region_id, cat_id, user_id)
select region_id, cat_id, user_id
from first_region_cat_owner
on conflict (region_id, cat_id) do nothing;

-- Verification SQL after applying:
--
-- with encounter_regions as (
--   select distinct trim(region_name) as region_name
--   from public.cat_encounters
--   where region_name is not null
--     and length(trim(region_name)) > 0
-- ),
-- encounter_region_cats as (
--   select
--     regions.id as region_id,
--     encounters.cat_id,
--     count(*)::integer as encounter_count
--   from public.cat_encounters encounters
--   join public.regions regions
--     on regions.name = trim(encounters.region_name)
--   where encounters.region_name is not null
--     and length(trim(encounters.region_name)) > 0
--     and coalesce(encounters.is_public, true)
--   group by regions.id, encounters.cat_id
-- )
-- select
--   (
--     select count(*)
--     from encounter_regions
--     left join public.regions regions
--       on regions.name = encounter_regions.region_name
--     where regions.id is null
--   ) as missing_region_rows,
--   (
--     select count(*)
--     from encounter_region_cats
--     left join public.cat_regions cat_regions
--       on cat_regions.region_id = encounter_region_cats.region_id
--      and cat_regions.cat_id = encounter_region_cats.cat_id
--     where cat_regions.cat_id is null
--   ) as missing_cat_region_rows,
--   (
--     select count(*)
--     from encounter_region_cats
--     join public.cat_regions cat_regions
--       on cat_regions.region_id = encounter_region_cats.region_id
--      and cat_regions.cat_id = encounter_region_cats.cat_id
--     where cat_regions.encounter_count <> encounter_region_cats.encounter_count
--   ) as stale_cat_region_counts;
