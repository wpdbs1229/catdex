-- 같은 동네에 두 번째 고양이를 등록하면 실패하던 문제를 고친다.
--
-- 000017의 calculate_cat_rarity는 지역 id를 담는 변수를 region_id로 선언했는데,
-- 이 이름이 cat_regions.region_id 컬럼과 겹친다. PL/pgSQL 기본값이
-- variable_conflict = error라서 아래 구문이 실행되는 순간 터진다.
--
--   where cat_regions.region_id = region_id
--   ERROR: column reference "region_id" is ambiguous
--
-- 첫 고양이는 그 동네가 아직 regions에 없어 이 분기를 타지 않는다.
-- 그래서 등록 두 번째부터 드러난다.
--
-- 고친 것은 변수명(region_id → v_region_id)뿐이고 산정 규칙은 그대로다.

create or replace function public.calculate_cat_rarity(
  p_type text,
  p_region_name text
)
returns table (
  rarity integer,
  reasons text[]
)
language plpgsql
stable
set search_path = ''
as $$
declare
  base_rarity integer := public.cat_type_base_rarity(p_type);
  final_rarity integer;
  reason_list text[] := array[]::text[];
  v_region_id text;
  region_total_count integer := 0;
  region_type_count integer := 0;
  global_total_count integer := 0;
  global_type_count integer := 0;
  global_type_ratio numeric := 0;
  scarcity_bonus integer := 0;
begin
  reason_list := array_append(reason_list, format('%s 기본 희귀도 %s성으로 시작했어요.', p_type, base_rarity));

  select regions.id
  into v_region_id
  from public.regions
  where regions.name = trim(p_region_name)
  limit 1;

  if v_region_id is not null then
    select count(distinct cat_regions.cat_id)
    into region_total_count
    from public.cat_regions
    where cat_regions.region_id = v_region_id;

    select count(distinct cats.id)
    into region_type_count
    from public.cat_regions
    join public.cats on cats.id = cat_regions.cat_id
    where cat_regions.region_id = v_region_id
      and cats.type = p_type;

    if region_total_count >= 3 and region_type_count = 0 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(reason_list, format('%s에서 아직 %s 기록이 없어 +1성이 붙었어요.', trim(p_region_name), p_type));
    elsif region_total_count >= 8 and region_type_count <= 1 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(reason_list, format('%s에서 %s 기록이 드문 편이라 +1성이 붙었어요.', trim(p_region_name), p_type));
    else
      reason_list := array_append(reason_list, format('%s의 기존 발견 분포도 함께 확인했어요.', trim(p_region_name)));
    end if;
  else
    reason_list := array_append(reason_list, '아직 동네 표본이 적어 털색 기본값 중심으로 산정했어요.');
  end if;

  select count(*)
  into global_total_count
  from public.cats;

  select count(*)
  into global_type_count
  from public.cats
  where cats.type = p_type;

  if global_total_count >= 10 then
    global_type_ratio := global_type_count::numeric / global_total_count::numeric;

    if global_type_ratio < 0.12 then
      scarcity_bonus := scarcity_bonus + 1;
      reason_list := array_append(
        reason_list,
        format('전체 도감에서 %s 비중이 약 %s%%라 +1성이 붙었어요.', p_type, round(global_type_ratio * 100))
      );
    else
      reason_list := array_append(
        reason_list,
        format('전체 도감에서 %s 비중은 약 %s%%예요.', p_type, round(global_type_ratio * 100))
      );
    end if;
  else
    reason_list := array_append(reason_list, '전체 도감 표본이 더 쌓이면 전역 희소성도 반영돼요.');
  end if;

  final_rarity := greatest(1, least(5, base_rarity + scarcity_bonus));

  if final_rarity = 5 and base_rarity + scarcity_bonus > 5 then
    reason_list := array_append(reason_list, '희귀도는 최대 5성까지만 표시돼요.');
  end if;

  return query select final_rarity, reason_list;
end;
$$;

grant execute on function public.calculate_cat_rarity(text, text) to authenticated;
