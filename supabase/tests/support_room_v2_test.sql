-- 고객지원실 V2 서버 모델 테스트 (pgTAP).
-- 실행: supabase test db  (로컬 스택 전용, 원격에 닿지 않는다)
--
-- 검증 범위 (docs/14 프롬프트 3 필수 로컬 테스트):
--   본인 CRUD / 교차 계정·anon 차단 / layout 버전 성공·충돌 /
--   구매 성공·잔액 부족·없는 상품·중복 멱등 / 재고 음수 불가

begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

-- ── 준비: 테스트 사용자 2명 ─────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.local', '', now(), '{}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.local', '', now(), '{}', '{}', now(), now());

-- ── 사용자 A: 최초 셋업과 멱등성 ────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select public.ensure_support_room_setup()->>'status'),
  'ok',
  'A: 최초 셋업 성공'
);

select is(
  (select count(*) from public.support_rooms where user_id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'A: 방이 하나 생겼다'
);

select is(
  (select count(*) from public.support_room_inventory where user_id = '11111111-1111-1111-1111-111111111111'),
  3::bigint,
  'A: 시작 지급 가구 3종'
);

select public.ensure_support_room_setup();

select is(
  (select sum(owned_quantity) from public.support_room_inventory where user_id = '11111111-1111-1111-1111-111111111111'),
  3::bigint,
  'A: 셋업 재호출에도 중복 지급 없음'
);

-- ── 경제: 지급·구매·멱등·부족 ───────────────────────────────────────────

select is(
  (select public.grant_support_room_points('grant-1', 'test_grant', 3000)->>'balance'),
  '3000',
  'A: 3000P 지급'
);

select is(
  (select public.grant_support_room_points('grant-1', 'test_grant', 3000)->>'status'),
  'duplicate',
  'A: 같은 키 지급 재호출은 duplicate'
);

select is(
  (select balance from public.support_room_wallets where user_id = '11111111-1111-1111-1111-111111111111'),
  3000,
  'A: 중복 지급으로 잔액이 늘지 않음'
);

select is(
  (select public.purchase_support_room_item('buy-1', 'service_bell_brass')->>'status'),
  'ok',
  'A: 호출벨 구매 성공'
);

select is(
  (select balance from public.support_room_wallets where user_id = '11111111-1111-1111-1111-111111111111'),
  1200,
  'A: 구매 후 잔액 = 3000 - 1800'
);

select is(
  (select owned_quantity from public.support_room_inventory
   where user_id = '11111111-1111-1111-1111-111111111111' and item_id = 'service_bell_brass'),
  1,
  'A: 구매 후 보관함 수량 1'
);

select is(
  (select public.purchase_support_room_item('buy-1', 'service_bell_brass')->>'status'),
  'duplicate',
  'A: 같은 멱등 키 재구매는 duplicate'
);

select is(
  (select balance from public.support_room_wallets where user_id = '11111111-1111-1111-1111-111111111111'),
  1200,
  'A: 중복 구매로 잔액이 더 줄지 않음'
);

select throws_ok(
  $$select public.purchase_support_room_item('buy-2', 'window_bench')$$,
  'P0001',
  '복지포인트가 부족해요',
  'A: 잔액 부족 구매 거절'
);

select throws_ok(
  $$select public.purchase_support_room_item('buy-3', 'no_such_item')$$,
  'P0002',
  '상품을 찾을 수 없어요',
  'A: 없는 상품 구매 거절'
);

select throws_ok(
  $$select public.purchase_support_room_item('buy-4', 'visitor_cushion_orange')$$,
  '22023',
  '시작 지급 상품은 구매할 수 없어요',
  'A: 시작 지급 상품 구매 거절'
);

-- ── 배치 저장: 성공·버전 충돌·미보유 거절 ───────────────────────────────

select is(
  (select public.save_support_room_layout(
    'main', 0, 'wallpaper_cream_plaster', 'flooring_honey_oak',
    '[{"placementId":"p1","furnitureId":"visitor_cushion_orange","surface":"floor","gridX":5,"gridY":5,"flipX":false},
      {"placementId":"p2","furnitureId":"service_bell_brass","surface":"floor","gridX":10,"gridY":4,"flipX":false}]'::jsonb
  )->>'layoutVersion'),
  '1',
  'A: expected 0 저장 성공 → 버전 1'
);

select is(
  (select public.save_support_room_layout(
    'main', 0, 'wallpaper_cream_plaster', 'flooring_honey_oak', '[]'::jsonb
  )->>'status'),
  'conflict',
  'A: 낡은 expected 버전은 conflict'
);

select is(
  (select count(*) from public.support_room_placements where user_id = '11111111-1111-1111-1111-111111111111'),
  2::bigint,
  'A: conflict 시 서버 배치가 지워지지 않음'
);

select throws_ok(
  $$select public.save_support_room_layout(
    'main', 1, 'wallpaper_cream_plaster', 'flooring_honey_oak',
    '[{"placementId":"p1","furnitureId":"window_bench","surface":"floor","gridX":3,"gridY":3,"flipX":false}]'::jsonb
  )$$,
  '42501',
  '보유하지 않은 가구는 배치할 수 없어요',
  'A: 미보유 가구 배치 거절'
);

select throws_ok(
  $$select public.save_support_room_layout(
    'main', 1, 'wallpaper_cream_plaster', 'flooring_honey_oak',
    '[{"placementId":"p1","furnitureId":"visitor_cushion_orange","surface":"floor","gridX":5,"gridY":9,"flipX":false}]'::jsonb
  )$$,
  '23514',
  null,
  'A: 그리드 밖 좌표는 DB 제약으로 거절'
);

-- ── 표면 소유 검증 ─────────────────────────────────────────────────────

select throws_ok(
  $$select public.save_support_room_layout(
    'main', 1, 'wallpaper_sage_linen', 'flooring_honey_oak', '[]'::jsonb
  )$$,
  '42501',
  '보유하지 않은 벽지·바닥은 적용할 수 없어요',
  'A: 구매하지 않은 벽지는 적용 거절'
);

select is(
  (select public.purchase_support_room_item('buy-wall', 'wallpaper_sage_linen')->>'status'),
  'ok',
  'A: 벽지 구매 성공 (1,200P 차감)'
);

select is(
  (select public.save_support_room_layout(
    'main', 1, 'wallpaper_sage_linen', 'flooring_honey_oak', '[]'::jsonb
  )->>'status'),
  'ok',
  'A: 구매한 벽지는 적용 성공'
);

-- ── 사용자 B와 교차 접근 차단 ───────────────────────────────────────────

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select public.ensure_support_room_setup();

select is(
  (select count(*) from public.support_rooms),
  1::bigint,
  'B: 자기 방 하나만 보인다 (A의 방 안 보임)'
);

select is(
  (select count(*) from public.support_room_economy_ledger),
  0::bigint,
  'B: A의 원장이 보이지 않는다'
);

select is(
  (select count(*) from public.support_room_placements),
  0::bigint,
  'B: A의 배치가 보이지 않는다'
);

-- ── V1 → V2 멱등 이전 ──────────────────────────────────────────────────

select is(
  (select public.migrate_support_room_v1(
    array['service_bell_brass', 'no_such_prop'],
    '[{"placementId":"m1","furnitureId":"visitor_cushion_orange","surface":"floor","gridX":5,"gridY":5,"flipX":false}]'::jsonb
  )->>'status'),
  'ok',
  'B: V1 이전 성공 (알 수 없는 비품은 무시)'
);

select is(
  (select owned_quantity from public.support_room_inventory
   where user_id = '22222222-2222-2222-2222-222222222222' and item_id = 'service_bell_brass'),
  1,
  'B: 이전으로 해금 비품이 보관함에 들어옴'
);

select is(
  (select count(*) from public.support_room_placements
   where user_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'B: 기본 레이아웃이 심어짐'
);

select is(
  (select public.migrate_support_room_v1(array['service_bell_brass'], '[]'::jsonb)->>'status'),
  'already_migrated',
  'B: 이전 재실행은 already_migrated'
);

select is(
  (select sum(owned_quantity) from public.support_room_inventory
   where user_id = '22222222-2222-2222-2222-222222222222'),
  4::bigint,
  'B: 이전을 두 번 실행해도 수량이 한 번만 지급됨'
);

-- ── anon 차단 ───────────────────────────────────────────────────────────

set local role anon;
set local request.jwt.claims to '{}';

select throws_ok(
  $$select count(*) from public.support_rooms$$,
  '42501',
  null,
  'anon: 테이블 접근 자체가 거부된다'
);

-- ── 재고 음수 불가 (DB 제약) ────────────────────────────────────────────

reset role;

select throws_ok(
  $$update public.support_room_inventory set owned_quantity = -1
    where user_id = '11111111-1111-1111-1111-111111111111' and item_id = 'service_bell_brass'$$,
  '23514',
  null,
  '재고 수량은 음수가 될 수 없다'
);

select * from finish();

rollback;
