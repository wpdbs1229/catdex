-- 고객지원실 V3 가구 배치 서버 저장.
--
-- V2 support_room_placements는 grid_x/grid_y가 integer(30×8 격자)라
-- V3의 0.5칸 단위 아이소 격자(8×6, 소수 좌표)를 못 담는다. V3는 가구
-- 5종이 고정이고 위치만 바뀌므로, placement_id·surface·layer 없이
-- furniture_id당 좌표 한 쌍만 갖는 훨씬 작은 테이블로 분리한다.
--
-- 쓰기는 이 저장소의 기존 패턴대로 SECURITY DEFINER RPC로만 한다.

create table public.support_room_v3_placements (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id text not null default 'main',
  furniture_id text not null references public.support_room_catalog(item_id),
  grid_x numeric not null check (grid_x >= 0 and grid_x < 8),
  grid_y numeric not null check (grid_y >= 0 and grid_y < 6),
  updated_at timestamptz not null default now(),
  primary key (user_id, room_id, furniture_id)
);

comment on table public.support_room_v3_placements is
  'V3 아이소 방 가구 위치. 가구 종류는 고정이라 furniture_id당 좌표 한 쌍만 저장한다.';

create index support_room_v3_placements_user_idx on public.support_room_v3_placements (user_id);

alter table public.support_room_v3_placements enable row level security;

grant select on public.support_room_v3_placements to authenticated;

create policy support_room_v3_placements_select_own on public.support_room_v3_placements
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ── RPC: 가구 한 개 위치 저장 ───────────────────────────────────────────
-- V3는 한 번에 가구 하나만 옮기므로(방향키 넛지) 전체 배치 교체 대신
-- upsert 하나로 충분하다. 동시 편집자가 없는 개인 방이라 낙관적 잠금도
-- 생략한다.

create function public.save_support_room_v3_placement(
  p_room_id text,
  p_furniture_id text,
  p_grid_x numeric,
  p_grid_y numeric
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

  insert into public.support_room_v3_placements (user_id, room_id, furniture_id, grid_x, grid_y)
  values (current_user_id, p_room_id, p_furniture_id, p_grid_x, p_grid_y)
  on conflict (user_id, room_id, furniture_id)
    do update set grid_x = excluded.grid_x, grid_y = excluded.grid_y, updated_at = now();

  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.save_support_room_v3_placement(text, text, numeric, numeric) from public;
grant execute on function public.save_support_room_v3_placement(text, text, numeric, numeric) to authenticated;
