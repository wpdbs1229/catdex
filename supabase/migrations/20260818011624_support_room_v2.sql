-- 고객지원실 V2 서버 정본.
--
-- 자유 배치 방(그리드 30×8 바닥, 30×5 벽)의 서버 권위 모델.
-- 정본: 방·layout_version·배치·보관함 수량·복지포인트 원장·방문 장면.
-- 로컬 전용(저장 안 함): 카메라 offset, 편집 draft, Undo/Redo.
--
-- 쓰기는 전부 SECURITY DEFINER RPC로만 한다(이 저장소의 기존 패턴).
-- 저장은 expected_version 낙관적 잠금 - 불일치면 예외가 아니라 구조화된
-- conflict 결과를 돌려주고, 클라이언트가 서버본/로컬안 중에서 고른다.

-- ── 카탈로그 ────────────────────────────────────────────────────────────
-- 가격·판매 상태의 서버 정본. 클라이언트 JSON은 표시용일 뿐 가격 검증은
-- 항상 이 테이블로 한다. 원본: 패키지 catalog-v2.json (schemaVersion 1).

create table public.support_room_catalog (
  item_id text primary key,
  item_type text not null check (item_type in ('furniture', 'surface')),
  name text not null,
  price integer not null check (price >= 0),
  acquisition text not null check (acquisition in ('starter', 'welfarePoint')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.support_room_catalog is '고객지원실 V2 상품 카탈로그. 가격 검증의 서버 정본.';

insert into public.support_room_catalog (item_id, item_type, name, price, acquisition) values
  ('visitor_cushion_orange', 'furniture', '방문자 방석', 0, 'starter'),
  ('service_bell_brass', 'furniture', '호출벨', 1800, 'welfarePoint'),
  ('swivel_chair_lavender', 'furniture', '회전의자', 0, 'starter'),
  ('paw_stamp_pad_orange', 'furniture', '발도장 패드', 1600, 'welfarePoint'),
  ('paper_basket_cream', 'furniture', '종이 바구니', 0, 'starter'),
  ('document_box_olive', 'furniture', '문서 상자', 1200, 'welfarePoint'),
  ('window_bench', 'furniture', '창가 벤치', 2600, 'welfarePoint'),
  ('customer_water_station', 'furniture', '고객용 정수기', 2200, 'welfarePoint'),
  ('reception_desk_cream', 'furniture', '접수 데스크', 1500, 'welfarePoint'),
  ('consultation_desk_honey', 'furniture', '상담 책상', 1400, 'welfarePoint'),
  ('meeting_table_round', 'furniture', '회의 테이블', 1600, 'welfarePoint'),
  ('office_sofa_sage', 'furniture', '사무실 소파', 1800, 'welfarePoint'),
  ('low_bookshelf_honey', 'furniture', '낮은 서가', 900, 'welfarePoint'),
  ('file_cabinet_olive', 'furniture', '파일 캐비닛', 1100, 'welfarePoint'),
  ('office_partition_cream', 'furniture', '사무실 파티션', 800, 'welfarePoint'),
  ('floor_lamp_warm', 'furniture', '플로어 조명', 700, 'welfarePoint'),
  ('plant_large_rubber', 'furniture', '큰 잎 화분', 700, 'welfarePoint'),
  ('plant_small_desk', 'furniture', '작은 책상 화분', 400, 'welfarePoint'),
  ('umbrella_stand_olive', 'furniture', '우산꽂이', 500, 'welfarePoint'),
  ('document_organizer_cream', 'furniture', '서류 정리대', 450, 'welfarePoint'),
  ('wall_clock_agency', 'furniture', '공사 벽시계', 400, 'welfarePoint'),
  ('bulletin_board_customer', 'furniture', '고객 안내 게시판', 600, 'welfarePoint'),
  ('agency_wall_sign', 'furniture', '대한냥냥공사 현판', 1000, 'welfarePoint'),
  ('employee_award_frame', 'furniture', '우수 사원 액자', 500, 'welfarePoint'),
  ('wall_shelf_honey', 'furniture', '벽걸이 선반', 650, 'welfarePoint'),
  ('wallpaper_cream_plaster', 'surface', '크림 미장 벽지', 0, 'starter'),
  ('wallpaper_sage_linen', 'surface', '세이지 린넨 벽지', 1200, 'welfarePoint'),
  ('wallpaper_apricot_pinstripe', 'surface', '살구 핀스트라이프 벽지', 1200, 'welfarePoint'),
  ('flooring_honey_oak', 'surface', '허니 오크 바닥', 0, 'starter'),
  ('flooring_cream_terrazzo', 'surface', '크림 테라조 바닥', 1500, 'welfarePoint'),
  ('flooring_warm_gray_carpet', 'surface', '웜그레이 사무실 카펫', 1200, 'welfarePoint');

-- ── 방 ─────────────────────────────────────────────────────────────────

create table public.support_rooms (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id text not null default 'main',
  layout_version integer not null default 0 check (layout_version >= 0),
  wall_surface_id text not null default 'wallpaper_cream_plaster'
    references public.support_room_catalog(item_id),
  floor_surface_id text not null default 'flooring_honey_oak'
    references public.support_room_catalog(item_id),
  -- 기존 고정 슬롯 데이터 이전의 멱등 처리용. 0 = 아직 이전 안 함.
  migration_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, room_id)
);

create table public.support_room_placements (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id text not null,
  placement_id text not null,
  furniture_id text not null references public.support_room_catalog(item_id),
  surface text not null check (surface in ('floor', 'wall')),
  grid_x integer not null check (grid_x >= 0 and grid_x < 30),
  grid_y integer not null check (grid_y >= 0),
  flip_x boolean not null default false,
  layer text not null default 'default',
  created_at timestamptz not null default now(),
  primary key (user_id, room_id, placement_id),
  foreign key (user_id, room_id) references public.support_rooms(user_id, room_id) on delete cascade,
  check ((surface = 'floor' and grid_y < 8) or (surface = 'wall' and grid_y < 5))
);

create table public.support_room_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  furniture_id text not null references public.support_room_catalog(item_id),
  owned_quantity integer not null default 0 check (owned_quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, furniture_id)
);

-- ── 경제 ────────────────────────────────────────────────────────────────
-- 잔액의 정본은 wallet 행(잠금 대상), 이력·멱등의 정본은 ledger.
-- ledger의 balance_after만으로 잔액을 정하면 정렬 동률에서 취약해서 분리했다.

create table public.support_room_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.support_room_economy_ledger (
  entry_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  reason text not null,
  delta integer not null,
  balance_after integer not null check (balance_after >= 0),
  reference_id text,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

-- ── 방문 장면 ───────────────────────────────────────────────────────────

create table public.support_room_visit_events (
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cat_id uuid not null,
  furniture_id text not null references public.support_room_catalog(item_id),
  behavior_id text not null,
  scheduled_at timestamptz not null,
  slot integer not null check (slot >= 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'played', 'summarized', 'skipped')),
  payload jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, scheduled_at, slot)
);

create index support_room_placements_user_idx on public.support_room_placements (user_id);
create index support_room_inventory_user_idx on public.support_room_inventory (user_id);
create index support_room_ledger_user_idx on public.support_room_economy_ledger (user_id, created_at desc);
create index support_room_visit_events_user_idx on public.support_room_visit_events (user_id, scheduled_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────
-- 읽기는 본인 행만, 쓰기는 전부 RPC. (기존 supply_shop 패턴과 동일)

alter table public.support_room_catalog enable row level security;
alter table public.support_rooms enable row level security;
alter table public.support_room_placements enable row level security;
alter table public.support_room_inventory enable row level security;
alter table public.support_room_wallets enable row level security;
alter table public.support_room_economy_ledger enable row level security;
alter table public.support_room_visit_events enable row level security;

-- RLS와 별개로 필요한 최소 권한만 명시적으로 grant (읽기 전용, 쓰기는 RPC)
grant select on
  public.support_room_catalog,
  public.support_rooms,
  public.support_room_placements,
  public.support_room_inventory,
  public.support_room_wallets,
  public.support_room_economy_ledger,
  public.support_room_visit_events
to authenticated;

create policy support_room_catalog_public_read on public.support_room_catalog
  for select to authenticated
  using (is_active);

create policy support_rooms_select_own on public.support_rooms
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy support_room_placements_select_own on public.support_room_placements
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy support_room_inventory_select_own on public.support_room_inventory
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy support_room_wallets_select_own on public.support_room_wallets
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy support_room_economy_ledger_select_own on public.support_room_economy_ledger
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy support_room_visit_events_select_own on public.support_room_visit_events
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ── RPC: 최초 셋업 ──────────────────────────────────────────────────────
-- 방·지갑·시작 지급 보관함을 멱등하게 만든다. 몇 번을 불러도 중복 지급 없음.

create function public.ensure_support_room_setup()
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

  insert into public.support_rooms (user_id)
  values (current_user_id)
  on conflict (user_id, room_id) do nothing;

  insert into public.support_room_wallets (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  -- 시작 지급 가구. 이미 행이 있으면 건드리지 않는다(중복 지급 방지).
  insert into public.support_room_inventory (user_id, furniture_id, owned_quantity)
  select current_user_id, c.item_id, 1
  from public.support_room_catalog c
  where c.item_type = 'furniture' and c.acquisition = 'starter'
  on conflict (user_id, furniture_id) do nothing;

  return jsonb_build_object('status', 'ok');
end;
$function$;

revoke all on function public.ensure_support_room_setup() from public;
grant execute on function public.ensure_support_room_setup() to authenticated;

-- ── RPC: 배치 저장 (낙관적 잠금) ────────────────────────────────────────

create function public.save_support_room_layout(
  p_room_id text,
  p_expected_version integer,
  p_wall_surface_id text,
  p_floor_surface_id text,
  p_placements jsonb
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
  next_version integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if jsonb_typeof(p_placements) is distinct from 'array' then
    raise exception '배치 목록 형식이 올바르지 않아요' using errcode = '22023';
  end if;

  select * into room
  from public.support_rooms
  where user_id = current_user_id and room_id = p_room_id
  for update;

  if not found then
    raise exception '고객지원실이 아직 없어요' using errcode = 'P0002';
  end if;

  if room.layout_version <> p_expected_version then
    return jsonb_build_object(
      'status', 'conflict',
      'serverVersion', room.layout_version,
      'expectedVersion', p_expected_version
    );
  end if;

  -- 표면은 카탈로그의 판매 중 surface만 허용
  if not exists (
    select 1 from public.support_room_catalog
    where item_id = p_wall_surface_id and item_type = 'surface' and is_active
  ) or not exists (
    select 1 from public.support_room_catalog
    where item_id = p_floor_surface_id and item_type = 'surface' and is_active
  ) then
    raise exception '적용할 수 없는 벽지·바닥이에요' using errcode = '22023';
  end if;

  -- 배치 수량이 보관함 소유량을 넘으면 거절
  if exists (
    select 1
    from (
      select value->>'furnitureId' as furniture_id, count(*) as used
      from jsonb_array_elements(p_placements)
      group by 1
    ) placed
    left join public.support_room_inventory inv
      on inv.user_id = current_user_id and inv.furniture_id = placed.furniture_id
    where coalesce(inv.owned_quantity, 0) < placed.used
  ) then
    raise exception '보유하지 않은 가구는 배치할 수 없어요' using errcode = '42501';
  end if;

  delete from public.support_room_placements
  where user_id = current_user_id and room_id = p_room_id;

  for item in select value from jsonb_array_elements(p_placements)
  loop
    insert into public.support_room_placements
      (user_id, room_id, placement_id, furniture_id, surface, grid_x, grid_y, flip_x, layer)
    values (
      current_user_id,
      p_room_id,
      item->>'placementId',
      item->>'furnitureId',
      item->>'surface',
      (item->>'gridX')::integer,
      (item->>'gridY')::integer,
      coalesce((item->>'flipX')::boolean, false),
      coalesce(item->>'layer', 'default')
    );
  end loop;

  next_version := room.layout_version + 1;

  update public.support_rooms
  set layout_version = next_version,
      wall_surface_id = p_wall_surface_id,
      floor_surface_id = p_floor_surface_id,
      updated_at = now()
  where user_id = current_user_id and room_id = p_room_id;

  return jsonb_build_object('status', 'ok', 'layoutVersion', next_version);
end;
$function$;

revoke all on function public.save_support_room_layout(text, integer, text, text, jsonb) from public;
grant execute on function public.save_support_room_layout(text, integer, text, text, jsonb) to authenticated;

-- ── RPC: 복지포인트 구매 ────────────────────────────────────────────────
-- 지갑 차감 → 원장 기록 → 보관함 증가를 한 트랜잭션으로.
-- 같은 idempotency_key 재호출은 저장된 결과를 그대로 돌려준다(중복 차감 없음).

create function public.purchase_support_room_item(
  p_idempotency_key text,
  p_item_id text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  catalog_item public.support_room_catalog;
  wallet public.support_room_wallets;
  existing public.support_room_economy_ledger;
  next_balance integer;
  next_quantity integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
    raise exception '멱등 키가 필요해요' using errcode = '22023';
  end if;

  select * into existing
  from public.support_room_economy_ledger
  where user_id = current_user_id and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'balance', existing.balance_after,
      'itemId', existing.reference_id
    );
  end if;

  select * into catalog_item
  from public.support_room_catalog
  where item_id = p_item_id and is_active;

  if not found then
    raise exception '상품을 찾을 수 없어요' using errcode = 'P0002';
  end if;

  if catalog_item.acquisition = 'starter' then
    raise exception '시작 지급 상품은 구매할 수 없어요' using errcode = '22023';
  end if;

  select * into wallet
  from public.support_room_wallets
  where user_id = current_user_id
  for update;

  if not found then
    raise exception '지갑이 아직 없어요' using errcode = 'P0002';
  end if;

  if wallet.balance < catalog_item.price then
    raise exception '복지포인트가 부족해요' using errcode = 'P0001';
  end if;

  next_balance := wallet.balance - catalog_item.price;

  update public.support_room_wallets
  set balance = next_balance, updated_at = now()
  where user_id = current_user_id;

  insert into public.support_room_economy_ledger
    (user_id, idempotency_key, reason, delta, balance_after, reference_id)
  values
    (current_user_id, p_idempotency_key, 'purchase', -catalog_item.price, next_balance, p_item_id);

  if catalog_item.item_type = 'furniture' then
    insert into public.support_room_inventory (user_id, furniture_id, owned_quantity)
    values (current_user_id, p_item_id, 1)
    on conflict (user_id, furniture_id)
      do update set owned_quantity = public.support_room_inventory.owned_quantity + 1,
                    updated_at = now()
    returning owned_quantity into next_quantity;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'balance', next_balance,
    'ownedQuantity', coalesce(next_quantity, 0)
  );
end;
$function$;

revoke all on function public.purchase_support_room_item(text, text) from public;
grant execute on function public.purchase_support_room_item(text, text) to authenticated;

-- ── RPC: 복지포인트 지급 ────────────────────────────────────────────────
-- 출석·행동 발견 등 앱 플레이 보상의 단일 창구. 같은 키 재호출은 무시.
-- 지급 사유별 정책(금액·한도)은 경제 기획 확정 후 여기에서만 조인다.

create function public.grant_support_room_points(
  p_idempotency_key text,
  p_reason text,
  p_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  wallet public.support_room_wallets;
  next_balance integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_amount <= 0 or p_amount > 5000 then
    raise exception '지급 금액이 올바르지 않아요' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.support_room_economy_ledger
    where user_id = current_user_id and idempotency_key = p_idempotency_key
  ) then
    select balance into next_balance from public.support_room_wallets where user_id = current_user_id;
    return jsonb_build_object('status', 'duplicate', 'balance', coalesce(next_balance, 0));
  end if;

  select * into wallet
  from public.support_room_wallets
  where user_id = current_user_id
  for update;

  if not found then
    raise exception '지갑이 아직 없어요' using errcode = 'P0002';
  end if;

  next_balance := wallet.balance + p_amount;

  update public.support_room_wallets
  set balance = next_balance, updated_at = now()
  where user_id = current_user_id;

  insert into public.support_room_economy_ledger
    (user_id, idempotency_key, reason, delta, balance_after)
  values
    (current_user_id, p_idempotency_key, p_reason, p_amount, next_balance);

  return jsonb_build_object('status', 'ok', 'balance', next_balance);
end;
$function$;

revoke all on function public.grant_support_room_points(text, text, integer) from public;
grant execute on function public.grant_support_room_points(text, text, integer) to authenticated;
