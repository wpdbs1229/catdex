alter table public.cats
  drop constraint if exists cats_type_check;

alter table public.cats
  add constraint cats_type_check
  check (
    type in (
      '치즈냥',
      '고등어냥',
      '갈색태비',
      '삼색이',
      '카오스냥',
      '턱시도',
      '젖소냥',
      '검은냥',
      '흰냥',
      '회색냥',
      '포인트냥',
      '얼룩냥',
      '기타냥'
    )
  );

alter table public.cat_sightings
  drop constraint if exists cat_sightings_coat_type_check;

alter table public.cat_sightings
  add constraint cat_sightings_coat_type_check
  check (
    coat_type in (
      '치즈냥',
      '고등어냥',
      '갈색태비',
      '삼색이',
      '카오스냥',
      '턱시도',
      '젖소냥',
      '검은냥',
      '흰냥',
      '회색냥',
      '포인트냥',
      '얼룩냥',
      '기타냥'
    )
  );

create or replace function public.cat_type_base_rarity(p_type text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when '치즈냥' then 2
    when '고등어냥' then 2
    when '갈색태비' then 2
    when '흰냥' then 2
    when '턱시도' then 3
    when '젖소냥' then 3
    when '검은냥' then 3
    when '회색냥' then 3
    when '얼룩냥' then 3
    when '삼색이' then 4
    when '카오스냥' then 4
    when '포인트냥' then 4
    else 3
  end;
$$;

grant execute on function public.cat_type_base_rarity(text) to authenticated;
