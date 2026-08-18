-- 방문 보상을 실시간 관람으로 한정한다.
--
-- 미접속 정산은 상담일지 기록은 남기되(재방문 유도), 시간 경과만으로
-- 복지포인트가 자동 적립되지는 않는다. 예외는 최초 발견 300P -
-- (고양이, 가구) 조합당 평생 1회라 시간 파밍이 불가능하다.
--
--   실시간 재방문: +100P / 정산 재방문: 0P / 최초 발견: +300P (경로 무관)
--
-- p_live는 클라이언트 주장이지만 보상을 줄이는 방향으로만 작동하므로
-- 조작 유인이 없다(true로 속여도 실시간과 같은 금액일 뿐, 서버 멱등 키가
-- 같은 장면의 중복 지급을 막는다).

drop function public.record_support_room_visit(text, uuid, text, text, timestamptz, integer, jsonb);

create function public.record_support_room_visit(
  p_event_id text,
  p_cat_id uuid,
  p_furniture_id text,
  p_behavior_id text,
  p_scheduled_at timestamptz,
  p_slot integer,
  p_payload jsonb,
  p_live boolean default true
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
    (p_event_id, current_user_id, p_cat_id, p_furniture_id, p_behavior_id, p_scheduled_at, p_slot,
     case when p_live then 'played' else 'summarized' end,
     coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('isFirstDiscovery', is_first_discovery))
  on conflict (user_id, scheduled_at, slot) do nothing;

  if not found then
    select balance into next_balance
    from public.support_room_wallets where user_id = current_user_id;
    return jsonb_build_object('status', 'duplicate', 'balance', coalesce(next_balance, 0));
  end if;

  reward := case
    when is_first_discovery then 300
    when p_live then 100
    else 0
  end;

  select balance into next_balance
  from public.support_room_wallets where user_id = current_user_id;

  if reward > 0 then
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
    end if;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'isFirstDiscovery', is_first_discovery,
    'balance', coalesce(next_balance, 0)
  );
end;
$function$;

revoke all on function public.record_support_room_visit(text, uuid, text, text, timestamptz, integer, jsonb, boolean) from public;
revoke execute on function public.record_support_room_visit(text, uuid, text, text, timestamptz, integer, jsonb, boolean) from anon;
grant execute on function public.record_support_room_visit(text, uuid, text, text, timestamptz, integer, jsonb, boolean) to authenticated;
