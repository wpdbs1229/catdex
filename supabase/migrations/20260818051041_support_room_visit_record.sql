-- 방문 장면 기록과 복지포인트 지급.
--
-- 클라이언트가 결정적으로 계획·재생한 장면(eventId = salt:scheduledAt:slot)을
-- 서버 정본으로 남긴다. 같은 event_id 재호출은 duplicate로 끝나고
-- 기록·보상 모두 두 번 생기지 않는다.
--
-- 지급량은 경제 시뮬레이션 전 임시 운영 기준: 재방문 100P, 최초 발견 300P.
-- 최초 발견 = 이 사용자에게 같은 (cat_id, furniture_id) 조합의 기록이 처음.

create function public.record_support_room_visit(
  p_event_id text,
  p_cat_id uuid,
  p_furniture_id text,
  p_behavior_id text,
  p_scheduled_at timestamptz,
  p_slot integer,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid := auth.uid();
  is_first_discovery boolean;
  reward integer;
  wallet public.support_room_wallets;
  next_balance integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.support_room_visit_events
    where event_id = p_event_id and user_id = current_user_id
  ) then
    select balance into next_balance
    from public.support_room_wallets where user_id = current_user_id;
    return jsonb_build_object('status', 'duplicate', 'balance', coalesce(next_balance, 0));
  end if;

  if not exists (
    select 1 from public.support_room_catalog
    where item_id = p_furniture_id and item_type = 'furniture'
  ) then
    raise exception '알 수 없는 가구예요' using errcode = 'P0002';
  end if;

  select not exists (
    select 1 from public.support_room_visit_events
    where user_id = current_user_id and cat_id = p_cat_id and furniture_id = p_furniture_id
  ) into is_first_discovery;

  insert into public.support_room_visit_events
    (event_id, user_id, cat_id, furniture_id, behavior_id, scheduled_at, slot, status, payload)
  values
    (p_event_id, current_user_id, p_cat_id, p_furniture_id, p_behavior_id, p_scheduled_at, p_slot, 'played',
     coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('isFirstDiscovery', is_first_discovery))
  on conflict (user_id, scheduled_at, slot) do nothing;

  if not found then
    -- 같은 시간 창·slot에 다른 event_id가 이미 기록됨. 중복으로 취급한다.
    select balance into next_balance
    from public.support_room_wallets where user_id = current_user_id;
    return jsonb_build_object('status', 'duplicate', 'balance', coalesce(next_balance, 0));
  end if;

  reward := case when is_first_discovery then 300 else 100 end;

  select * into wallet
  from public.support_room_wallets
  where user_id = current_user_id
  for update;

  if found then
    next_balance := wallet.balance + reward;
    update public.support_room_wallets
    set balance = next_balance, updated_at = now()
    where user_id = current_user_id;

    insert into public.support_room_economy_ledger
      (user_id, idempotency_key, reason, delta, balance_after, reference_id)
    values
      (current_user_id, 'visit:' || p_event_id,
       case when is_first_discovery then 'visit_first_discovery' else 'visit' end,
       reward, next_balance, p_event_id);
  else
    next_balance := 0;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'isFirstDiscovery', is_first_discovery,
    'balance', next_balance
  );
end;
$function$;

revoke all on function public.record_support_room_visit(text, uuid, text, text, timestamptz, integer, jsonb) from public;
grant execute on function public.record_support_room_visit(text, uuid, text, text, timestamptz, integer, jsonb) to authenticated;
