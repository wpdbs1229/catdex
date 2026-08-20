-- 방 확장을 서버가 관리한다.
--
-- 지금까지 단계는 클라이언트에 'stage0'으로 박혀 있었고 확장은 살 수 없었다.
-- 단계를 서버에 두고, 반드시 바로 다음 단계만 살 수 있게 한다.
-- 순서를 건너뛰는 구매는 sequence + 1 조회 자체가 막는다.

create table if not exists public.support_room_stages (
  stage text primary key,
  sequence integer not null unique,
  name text not null,
  cost integer not null check (cost >= 0)
);

insert into public.support_room_stages (stage, sequence, name, cost) values
  ('stage0', 0, '임시 상담실', 0),
  ('stage1', 1, '정식 고객지원실', 8000),
  ('stage2', 2, '행운동 지부', 22000),
  ('stage3', 3, '확장 지부', 48000),
  ('stage4', 4, '본관 · 별관', 95000)
on conflict (stage) do update
  set sequence = excluded.sequence, name = excluded.name, cost = excluded.cost;

alter table public.support_room_stages enable row level security;

drop policy if exists "stages are readable by everyone" on public.support_room_stages;
create policy "stages are readable by everyone"
  on public.support_room_stages for select
  using (true);

alter table public.support_rooms
  add column if not exists stage text not null default 'stage0'
    references public.support_room_stages (stage);

create or replace function public.expand_support_room(p_idempotency_key text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  current_stage text;
  current_sequence integer;
  next_stage public.support_room_stages;
  wallet public.support_room_wallets;
  existing public.support_room_economy_ledger;
  next_balance integer;
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
    select stage into current_stage
    from public.support_rooms
    where user_id = current_user_id and room_id = 'main';
    return jsonb_build_object(
      'status', 'duplicate',
      'balance', existing.balance_after,
      'stage', coalesce(current_stage, 'stage0')
    );
  end if;

  insert into public.support_rooms (user_id, room_id)
  values (current_user_id, 'main')
  on conflict (user_id, room_id) do nothing;

  select stage into current_stage
  from public.support_rooms
  where user_id = current_user_id and room_id = 'main'
  for update;

  select sequence into current_sequence
  from public.support_room_stages where stage = current_stage;

  -- 바로 다음 단계만 고른다. 건너뛰기가 원천적으로 불가능하다.
  select * into next_stage
  from public.support_room_stages
  where sequence = current_sequence + 1;

  if not found then
    raise exception '더 넓힐 수 없어요' using errcode = 'P0002';
  end if;

  select * into wallet
  from public.support_room_wallets
  where user_id = current_user_id
  for update;

  if not found or wallet.balance < next_stage.cost then
    raise exception '복지포인트가 부족해요' using errcode = 'P0001';
  end if;

  next_balance := wallet.balance - next_stage.cost;

  update public.support_room_wallets
  set balance = next_balance, updated_at = now()
  where user_id = current_user_id;

  update public.support_rooms
  set stage = next_stage.stage, updated_at = now()
  where user_id = current_user_id and room_id = 'main';

  insert into public.support_room_economy_ledger
    (user_id, idempotency_key, reason, delta, balance_after, reference_id)
  values
    (current_user_id, p_idempotency_key, 'room_expand', -next_stage.cost, next_balance,
     next_stage.stage);

  return jsonb_build_object(
    'status', 'ok',
    'balance', next_balance,
    'stage', next_stage.stage
  );
end;
$function$;

revoke all on function public.expand_support_room(text) from public;
grant execute on function public.expand_support_room(text) to authenticated;
