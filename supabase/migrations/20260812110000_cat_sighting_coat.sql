-- 미확인 목격에도 컬러·무늬를 남긴다.
--
-- cat_sightings에는 coat_type 하나뿐이라, 도감의 잠금 카드는 아직 한국어
-- 털색 분류로만 표현된다. 개체(cats)는 이미 두 축을 저장하는데 목격만
-- 뒤처져 있어서, 컬러·무늬 필터를 걸면 잠금 카드가 늘 통째로 빠진다.
--
-- 값 집합과 제약은 cats와 같게 맞춘다.

alter table public.cat_sightings
  add column if not exists coat_colors text[] not null default '{}',
  add column if not exists coat_pattern text;

alter table public.cat_sightings
  drop constraint if exists cat_sightings_coat_pattern_check;

alter table public.cat_sightings
  add constraint cat_sightings_coat_pattern_check check (
    coat_pattern is null or coat_pattern in ('solid', 'bicolor', 'tabby', 'tortie')
  );

alter table public.cat_sightings
  drop constraint if exists cat_sightings_coat_colors_check;

alter table public.cat_sightings
  add constraint cat_sightings_coat_colors_check check (
    coat_colors <@ array[
      'black', 'gray', 'brown', 'chocolate', 'cinnamon',
      'orange', 'cream', 'lilac', 'white'
    ]::text[]
  );

-- 기존 목격 백필. cats를 백필할 때(20260811100000)와 같은 근사표를 쓴다.
-- 분류 하나에 여러 조합이 뭉쳐 있어 정확한 역산은 불가능하고, 각 분류에서
-- 가장 흔한 조합 하나로 추정한 값이다.
update public.cat_sightings
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
) as mapped(coat_type, colors, pattern)
where public.cat_sightings.coat_type = mapped.coat_type
  and coalesce(array_length(public.cat_sightings.coat_colors, 1), 0) = 0
  and public.cat_sightings.coat_pattern is null;

-- 얼룩냥은 색이 미상인 투톤이라 패턴만 채운다. 포인트냥·기타냥은 근사할 조합이 없다.
update public.cat_sightings
set coat_pattern = 'bicolor'
where coat_type = '얼룩냥'
  and coat_pattern is null;

-- 목격 등록도 두 축을 받는다. coat_type은 아직 not null이라 함께 받아 둔다.
drop function if exists public.create_cat_sighting(text, text, text, text);

create or replace function public.create_cat_sighting(
  p_region_name text,
  p_coat_type text,
  p_behavior_hint text default '',
  p_image_url text default null,
  p_coat_colors text[] default '{}',
  p_coat_pattern text default null
)
returns public.cat_sightings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_sighting public.cat_sightings;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_region_name is null or length(trim(p_region_name)) = 0 then
    raise exception 'Region name is required' using errcode = '22023';
  end if;

  insert into public.cat_sightings (
    reporter_id,
    region_name,
    coat_type,
    coat_colors,
    coat_pattern,
    behavior_hint,
    image_url
  )
  values (
    current_user_id,
    trim(p_region_name),
    p_coat_type,
    coalesce(p_coat_colors, '{}'),
    p_coat_pattern,
    trim(coalesce(p_behavior_hint, '')),
    p_image_url
  )
  returning * into next_sighting;

  return next_sighting;
end;
$$;

revoke all on function public.create_cat_sighting(text, text, text, text, text[], text) from public;
revoke execute on function public.create_cat_sighting(text, text, text, text, text[], text) from anon;
grant execute on function public.create_cat_sighting(text, text, text, text, text[], text) to authenticated;
