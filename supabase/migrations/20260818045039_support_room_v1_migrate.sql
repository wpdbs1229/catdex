-- 기존 고정 슬롯 고객지원실 → V2 멱등 이전.
--
-- V1 데이터(설치 비품·해금 비품)는 클라이언트 AsyncStorage에만 있어서 서버가
-- 직접 읽을 수 없다. 클라이언트가 목록을 넘기면 서버가 검증·지급한다.
-- 멱등성: support_rooms.migration_version이 0일 때만 실행하고 1로 올린다.
-- 두 번 불러도, 일부 실패 후 재시도해도 중복 지급이 없다.
-- 원본 AsyncStorage 데이터는 이 RPC가 건드리지 않는다(롤백용으로 유지).

create function public.migrate_support_room_v1(
  p_unlocked_furniture text[],
  p_layout jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  room public.support_rooms;
  item jsonb;
  granted integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if jsonb_typeof(p_layout) is distinct from 'array' then
    raise exception '배치 목록 형식이 올바르지 않아요' using errcode = '22023';
  end if;

  -- 방·지갑·시작 지급이 없으면 먼저 만든다 (ensure와 같은 멱등 규칙)
  perform public.ensure_support_room_setup();

  select * into room
  from public.support_rooms
  where user_id = current_user_id and room_id = 'main'
  for update;

  if room.migration_version >= 1 then
    return jsonb_build_object('status', 'already_migrated', 'migrationVersion', room.migration_version);
  end if;

  -- 해금 비품 지급: 카탈로그에 있는 가구만, 이미 가진 것은 건드리지 않는다.
  insert into public.support_room_inventory (user_id, item_id, owned_quantity)
  select current_user_id, c.item_id, 1
  from unnest(p_unlocked_furniture) as unlocked(furniture_id)
  join public.support_room_catalog c
    on c.item_id = unlocked.furniture_id and c.item_type = 'furniture' and c.is_active
  on conflict (user_id, item_id) do nothing;

  get diagnostics granted = row_count;

  -- 기본 레이아웃: 방이 아직 비어 있을 때만 심는다(이미 꾸민 방을 덮지 않음).
  if not exists (
    select 1 from public.support_room_placements
    where user_id = current_user_id and room_id = 'main'
  ) then
    for item in select value from jsonb_array_elements(p_layout)
    loop
      -- 보유하지 않은 가구가 섞여 있으면 그 항목만 조용히 건너뛴다.
      if exists (
        select 1 from public.support_room_inventory
        where user_id = current_user_id and item_id = item->>'furnitureId' and owned_quantity > 0
      ) then
        insert into public.support_room_placements
          (user_id, room_id, placement_id, furniture_id, surface, grid_x, grid_y, flip_x)
        values (
          current_user_id, 'main',
          item->>'placementId',
          item->>'furnitureId',
          item->>'surface',
          (item->>'gridX')::integer,
          (item->>'gridY')::integer,
          coalesce((item->>'flipX')::boolean, false)
        )
        on conflict (user_id, room_id, placement_id) do nothing;
      end if;
    end loop;

    update public.support_rooms
    set layout_version = layout_version + 1, updated_at = now()
    where user_id = current_user_id and room_id = 'main';
  end if;

  update public.support_rooms
  set migration_version = 1, updated_at = now()
  where user_id = current_user_id and room_id = 'main';

  return jsonb_build_object('status', 'ok', 'grantedCount', granted);
end;
$function$;

revoke all on function public.migrate_support_room_v1(text[], jsonb) from public;
grant execute on function public.migrate_support_room_v1(text[], jsonb) to authenticated;
