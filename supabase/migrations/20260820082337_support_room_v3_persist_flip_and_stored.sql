-- 꾸미기에서 한 일이 전부 남게 한다.
--
-- 지금까지는 좌표만 저장해서, 가구를 보관함에 넣거나 좌우로 뒤집어도
-- 다시 들어오면 기본 배치가 되살아나며 되돌아갔다. 존재 여부(stored)와
-- 반전(flip_x)을 함께 저장한다.

alter table public.support_room_v3_placements
  add column if not exists flip_x boolean not null default false,
  add column if not exists stored boolean not null default false;

create or replace function public.save_support_room_v3_placement(
  p_room_id text,
  p_furniture_id text,
  p_grid_x numeric,
  p_grid_y numeric,
  p_flip_x boolean default false,
  p_stored boolean default false
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  insert into public.support_room_v3_placements (
    user_id, room_id, furniture_id, grid_x, grid_y, flip_x, stored
  )
  values (
    current_user_id, p_room_id, p_furniture_id, p_grid_x, p_grid_y,
    coalesce(p_flip_x, false), coalesce(p_stored, false)
  )
  on conflict (user_id, room_id, furniture_id)
    do update set
      grid_x = excluded.grid_x,
      grid_y = excluded.grid_y,
      flip_x = excluded.flip_x,
      stored = excluded.stored,
      updated_at = now();

  return jsonb_build_object('status', 'ok');
end;
$function$;

-- 기본값이 있어 4인자 호출이 두 오버로드에 모두 맞아 PostgREST가 거절한다.
drop function if exists public.save_support_room_v3_placement(text, text, numeric, numeric);
