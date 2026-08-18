-- 고양이 수집으로 복지포인트 획득.
--
-- 수집이 앱의 핵심 행동이므로 경제의 주 수입원도 수집이어야 한다.
-- create_cat(신규 등록)과 record_cat_encounter(재발견)는 모두
-- cat_encounters / user_cat_collections에 행을 남기므로, RPC 본문 대신
-- 그 두 테이블의 트리거에서 지급한다 - 어떤 경로로 수집해도 빠지지 않는다.
--
-- 지급량(경제 시뮬레이션 전 임시 운영 기준):
--   만남 1건 +100P, 새 고양이 도감 등록 보너스 +400P (신규 수집 합계 500P)
--   만남 삭제 시 -100P 회수(잔액 바닥 0) - 등록·삭제 반복 파밍 방지
-- 멱등성: 원장 idempotency_key = 행 기반 키. 같은 행으로 두 번 지급되지 않는다.

-- ── 공용 지급 헬퍼 ──────────────────────────────────────────────────────
-- grant_support_room_points와 달리 지갑이 없으면 만들어 준다(수집이 고객지원실
-- 첫 진입보다 먼저 일어날 수 있다). 차감은 잔액 0에서 멈추고 실제 적용량만
-- 원장에 남긴다.

create function private.grant_welfare_points(
  p_user_id uuid,
  p_idempotency_key text,
  p_reason text,
  p_amount integer
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  wallet public.support_room_wallets;
  applied integer;
  next_balance integer;
begin
  if p_user_id is null or p_amount = 0 then
    return;
  end if;

  if exists (
    select 1 from public.support_room_economy_ledger
    where user_id = p_user_id and idempotency_key = p_idempotency_key
  ) then
    return;
  end if;

  insert into public.support_room_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into wallet
  from public.support_room_wallets
  where user_id = p_user_id
  for update;

  applied := greatest(p_amount, -wallet.balance);
  next_balance := wallet.balance + applied;

  update public.support_room_wallets
  set balance = next_balance, updated_at = now()
  where user_id = p_user_id;

  insert into public.support_room_economy_ledger
    (user_id, idempotency_key, reason, delta, balance_after)
  values
    (p_user_id, p_idempotency_key, p_reason, applied, next_balance);
end;
$function$;

revoke all on function private.grant_welfare_points(uuid, text, text, integer) from public;

-- ── 트리거 ──────────────────────────────────────────────────────────────

create function private.reward_cat_encounter()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  perform private.grant_welfare_points(
    new.user_id, 'encounter:' || new.id, 'cat_encounter', 100
  );
  return new;
end;
$function$;

create function private.reward_cat_collection()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  perform private.grant_welfare_points(
    new.user_id, 'collect:' || new.user_id || ':' || new.cat_id, 'cat_collect_bonus', 400
  );
  return new;
end;
$function$;

create function private.reclaim_cat_encounter()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- 지급된 적 있는 만남만 회수한다(과거 데이터 삭제로 음수 원장이 쌓이지 않게).
  if exists (
    select 1 from public.support_room_economy_ledger
    where user_id = old.user_id and idempotency_key = 'encounter:' || old.id
  ) then
    perform private.grant_welfare_points(
      old.user_id, 'encounter-removed:' || old.id, 'cat_encounter_removed', -100
    );
  end if;
  return old;
end;
$function$;

create trigger reward_cat_encounter
  after insert on public.cat_encounters
  for each row execute function private.reward_cat_encounter();

create trigger reward_cat_collection
  after insert on public.user_cat_collections
  for each row execute function private.reward_cat_collection();

create trigger reclaim_cat_encounter
  after delete on public.cat_encounters
  for each row execute function private.reclaim_cat_encounter();

-- ── 소급 지급 ───────────────────────────────────────────────────────────
-- 이미 수집한 사용자가 새 규칙에서 손해 보지 않게, 기존 만남·도감에도
-- 같은 규칙·같은 키로 1회 지급한다. 키가 같아 트리거와 중복되지 않는다.

insert into public.support_room_wallets (user_id)
select distinct user_id from public.user_cat_collections
on conflict (user_id) do nothing;

-- 데이터 수정 CTE는 같은 스냅숏을 보므로, 갱신 전 잔액 + 사용자별 합계로
-- balance_after를 계산한다(소급분 원장은 행별 중간 잔액 대신 최종 잔액).
with encounter_grants as (
  select e.user_id, 'encounter:' || e.id as key, 100 as amount
  from public.cat_encounters e
  union all
  select c.user_id, 'collect:' || c.user_id || ':' || c.cat_id, 400
  from public.user_cat_collections c
),
new_grants as (
  select g.user_id, g.key, g.amount
  from encounter_grants g
  where not exists (
    select 1 from public.support_room_economy_ledger l
    where l.user_id = g.user_id and l.idempotency_key = g.key
  )
),
totals as (
  select user_id, sum(amount)::integer as total from new_grants group by user_id
),
bump as (
  update public.support_room_wallets w
  set balance = w.balance + t.total, updated_at = now()
  from totals t
  where w.user_id = t.user_id
  returning w.user_id
)
insert into public.support_room_economy_ledger (user_id, idempotency_key, reason, delta, balance_after)
select
  g.user_id,
  g.key,
  case when g.key like 'collect:%' then 'cat_collect_bonus_backfill' else 'cat_encounter_backfill' end,
  g.amount,
  w.balance + t.total
from new_grants g
join totals t on t.user_id = g.user_id
join public.support_room_wallets w on w.user_id = g.user_id;
