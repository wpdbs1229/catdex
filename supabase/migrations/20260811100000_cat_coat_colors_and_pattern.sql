-- 도감 필터(3_도감_필터 시안)는 컬러와 패턴 두 축으로 거른다.
-- 촬영 화면은 이미 두 값을 만들지만 deriveCatType이 cats.type 하나로 접어서 저장해 왔다.
-- 접기 전 원본을 함께 남겨야 시안대로 거를 수 있다.
--
-- type을 대체하지 않고 함께 둔다. type은 도감 표시와 희귀도 산정(000017)이 쓰고 있다.

alter table public.cats
  add column if not exists coat_colors text[] not null default '{}',
  add column if not exists coat_pattern text;

-- 값 집합은 클라이언트 coat.types.ts의 CoatColorId · CoatPatternId와 같아야 한다.
alter table public.cats
  drop constraint if exists cats_coat_pattern_check;

alter table public.cats
  add constraint cats_coat_pattern_check check (
    coat_pattern is null or coat_pattern in ('solid', 'bicolor', 'tabby', 'tortie')
  );

alter table public.cats
  drop constraint if exists cats_coat_colors_check;

alter table public.cats
  add constraint cats_coat_colors_check check (
    coat_colors <@ array[
      'black', 'gray', 'brown', 'chocolate', 'cinnamon',
      'orange', 'cream', 'lilac', 'white'
    ]::text[]
  );

-- 필터는 내 도감(user_id) 안에서 건다.
create index if not exists idx_cats_user_coat_pattern
  on public.cats(user_id, coat_pattern);

create index if not exists idx_cats_coat_colors
  on public.cats using gin (coat_colors);

-- 기존 행 백필.
--
-- deriveCatType은 여러 조합을 한 type으로 접는 단방향 변환이라 정확한 역산이 불가능하다.
-- 예를 들어 치즈냥 하나에 orange/cream × tabby/solid 네 조합이 뭉쳐 있다.
-- 그래서 각 type에서 가장 흔한 조합 하나로 근사한다. 되돌린 값이 아니라 추정값이다.
-- 이미 값이 있는 행은 건드리지 않는다.
update public.cats
set
  coat_colors = mapped.colors,
  coat_pattern = mapped.pattern
from (
  values
    ('검은냥', array['black'], 'solid'),
    ('흰냥', array['white'], 'solid'),
    ('회색냥', array['gray'], 'solid'),
    ('치즈냥', array['orange'], 'tabby'),
    ('갈색태비', array['brown'], 'tabby'),
    ('고등어냥', array['gray'], 'tabby'),
    ('삼색이', array['orange'], 'tortie'),
    ('카오스냥', array['black'], 'tortie'),
    ('턱시도', array['black'], 'bicolor'),
    ('젖소냥', array['white'], 'bicolor')
) as mapped(type, colors, pattern)
where public.cats.type = mapped.type
  and coalesce(array_length(public.cats.coat_colors, 1), 0) = 0
  and public.cats.coat_pattern is null;

-- 얼룩냥·포인트냥·기타냥은 근사할 조합이 없어 비워 둔다.
-- 얼룩냥은 색이 미상인 투톤이므로 패턴만 채운다.
update public.cats
set coat_pattern = 'bicolor'
where type = '얼룩냥'
  and coat_pattern is null;

-- create_cat이 컬러·패턴을 받도록 넓힌다.
-- 기본값을 준 새 인자를 덧붙이면 6인자 호출이 옛 함수와 모호해지므로 옛 시그니처를 먼저 지운다.
drop function if exists public.create_cat(text, text, text[], text, text, text);

create or replace function public.create_cat(
  p_name text,
  p_type text,
  p_tags text[],
  p_region_name text,
  p_memo text,
  p_image_url text default null,
  p_coat_colors text[] default '{}',
  p_coat_pattern text default null
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

revoke all on function public.create_cat(text, text, text[], text, text, text, text[], text) from public;
revoke execute on function public.create_cat(text, text, text[], text, text, text, text[], text) from anon;
grant execute on function public.create_cat(text, text, text[], text, text, text, text[], text) to authenticated;
