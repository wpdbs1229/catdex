-- 시안(마이페이지_알림)의 스위치 세 개를 기준으로 한 알림 스택. docs/notifications.md 참고.
-- 스위치는 분류(category) 단위이고, 세부 이벤트(type)가 늘어도 스위치 수는 그대로다.

-- ---------------------------------------------------------------------------
-- 내 동네 (발견 알림의 발송 대상을 서버가 알기 위해 필요)
-- ---------------------------------------------------------------------------

-- 좌표는 저장하지 않는다. 행정동/법정동 이름만 남기는 기존 구역 정책을 따른다.
create table if not exists public.user_neighborhoods (
  user_id uuid not null references auth.users(id) on delete cascade,
  neighborhood_name text not null check (length(btrim(neighborhood_name)) between 1 and 40),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, neighborhood_name)
);

create index if not exists idx_user_neighborhoods_name
  on public.user_neighborhoods(neighborhood_name);

alter table public.user_neighborhoods enable row level security;

create policy "user_neighborhoods_select_own"
  on public.user_neighborhoods for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_neighborhoods_insert_own"
  on public.user_neighborhoods for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_neighborhoods_update_own"
  on public.user_neighborhoods for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_neighborhoods_delete_own"
  on public.user_neighborhoods for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists user_neighborhoods_set_updated_at on public.user_neighborhoods;
create trigger user_neighborhoods_set_updated_at
  before update on public.user_neighborhoods
  for each row execute function public.set_updated_at();

-- 앱이 감지한 동네 목록을 통째로 맞바꾼다. 클라이언트가 최대 5개까지만 보낸다.
create or replace function public.sync_my_neighborhoods(
  p_names text[],
  p_active_name text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  clean_names text[];
begin
  select array_agg(distinct btrim(name))
  into clean_names
  from unnest(coalesce(p_names, '{}'::text[])) as name
  where btrim(name) <> '';

  clean_names := coalesce(clean_names, '{}'::text[]);

  if array_length(clean_names, 1) > 5 then
    raise exception '동네는 최대 5개까지 저장할 수 있어요.';
  end if;

  delete from public.user_neighborhoods
  where user_id = (select auth.uid())
    and neighborhood_name <> all (clean_names);

  insert into public.user_neighborhoods (user_id, neighborhood_name, is_active)
  select (select auth.uid()), name, name is not distinct from btrim(coalesce(p_active_name, ''))
  from unnest(clean_names) as name
  on conflict (user_id, neighborhood_name)
  do update set is_active = excluded.is_active, updated_at = now();
end;
$$;

revoke all on function public.sync_my_neighborhoods(text[], text) from public;
revoke all on function public.sync_my_neighborhoods(text[], text) from anon;
grant execute on function public.sync_my_neighborhoods(text[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- 알림 설정 / 기기 / 이벤트
-- ---------------------------------------------------------------------------

-- marketing은 기본 꺼짐이다. 정보통신망법상 광고성 정보는 사전 수신 동의가 필요하고,
-- 켠 시각을 marketing_agreed_at에 남겨 동의 시점을 증명한다.
create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  discovery_enabled boolean not null default true,
  activity_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  marketing_agreed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web', 'unknown')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('discovery', 'activity', 'marketing')),
  type text not null check (
    type in (
      'neighborhood_sighting',
      'neighborhood_new_cat',
      'cat_rediscovery',
      'badge_awarded',
      'post_reaction',
      'campaign'
    )
  ),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  -- 알림함의 읽지 않음 표시(헤더 벨의 빨간 점)에 쓴다.
  read_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_devices_user_enabled
  on public.notification_devices(user_id, enabled, last_seen_at desc);

create index if not exists idx_notification_events_pending
  on public.notification_events(status, created_at asc)
  where status = 'pending';

create index if not exists idx_notification_events_inbox
  on public.notification_events(recipient_id, created_at desc);

create index if not exists idx_notification_events_unread
  on public.notification_events(recipient_id)
  where read_at is null;

alter table public.notification_settings enable row level security;
alter table public.notification_devices enable row level security;
alter table public.notification_events enable row level security;

create policy "notification_settings_select_own"
  on public.notification_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "notification_settings_insert_own"
  on public.notification_settings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "notification_settings_update_own"
  on public.notification_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notification_devices_select_own"
  on public.notification_devices for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "notification_devices_delete_own"
  on public.notification_devices for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- 이벤트는 읽음 처리만 사용자가 한다. 생성은 트리거(security definer)가 맡는다.
-- RLS는 컬럼을 가릴 수 없어서, 제목·본문을 고쳐 쓰지 못하도록 update 권한을 read_at으로 좁힌다.
revoke insert, update, delete on public.notification_events from authenticated;
grant update (read_at) on public.notification_events to authenticated;

create policy "notification_events_select_own"
  on public.notification_events for select
  to authenticated
  using (recipient_id = (select auth.uid()));

create policy "notification_events_update_own_read"
  on public.notification_events for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

drop trigger if exists notification_settings_set_updated_at on public.notification_settings;
create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

drop trigger if exists notification_devices_set_updated_at on public.notification_devices;
create trigger notification_devices_set_updated_at
  before update on public.notification_devices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 큐 적재
-- ---------------------------------------------------------------------------

-- 수신자가 끈 분류는 애초에 쌓지 않는다. 설정 행이 없으면 기본값(발견·활동 켜짐,
-- 이벤트 꺼짐)으로 판단한다.
create or replace function private.enqueue_notification_event(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_category text,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_event_id uuid;
  is_enabled boolean;
  local_hour integer;
begin
  if p_recipient_id is null then
    return null;
  end if;

  -- 내 행동으로 나에게 알리지 않는다.
  if p_actor_id is not null and p_recipient_id = p_actor_id then
    return null;
  end if;

  select case p_category
           when 'discovery' then coalesce(settings.discovery_enabled, true)
           when 'activity' then coalesce(settings.activity_enabled, true)
           when 'marketing' then coalesce(settings.marketing_enabled, false)
           else false
         end
  into is_enabled
  from (select p_recipient_id as user_id) as target
  left join public.notification_settings settings on settings.user_id = target.user_id;

  if not coalesce(is_enabled, case p_category when 'marketing' then false else true end) then
    return null;
  end if;

  -- 광고성 정보 야간 발송(21시~08시)에는 별도 동의가 필요하므로 보내지 않는다.
  if p_category = 'marketing' then
    local_hour := extract(hour from (now() at time zone 'Asia/Seoul'));

    if local_hour >= 21 or local_hour < 8 then
      return null;
    end if;
  end if;

  insert into public.notification_events (
    recipient_id, actor_id, category, type, title, body, data
  )
  values (
    p_recipient_id, p_actor_id, p_category, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb)
  )
  returning id into next_event_id;

  return next_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 발견 알림 트리거
-- ---------------------------------------------------------------------------

-- 구역 이름은 "부천시 중동 근처"처럼 꾸며져 들어오고, 사용자가 저장한 동네는 "중동"처럼
-- 행정동/법정동 이름만 있다. 포함 관계로 맞춘다.
create or replace function private.notify_neighborhood_sighting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  neighbor record;
begin
  for neighbor in
    select distinct hoods.user_id
    from public.user_neighborhoods hoods
    where hoods.is_active
      and new.region_name ilike '%' || hoods.neighborhood_name || '%'
      and hoods.user_id <> coalesce(new.reporter_id, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    perform private.enqueue_notification_event(
      neighbor.user_id,
      new.reporter_id,
      'discovery',
      'neighborhood_sighting',
      '우리 동네에 새 고양이가 나타났어요',
      new.region_name || '에 아직 도감에 없는 고양이가 제보됐어요.',
      jsonb_build_object(
        'screen', 'neighborhoodDex',
        'sightingId', new.id,
        'regionName', new.region_name
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists cat_sightings_notify_neighborhood on public.cat_sightings;
create trigger cat_sightings_notify_neighborhood
  after insert on public.cat_sightings
  for each row execute function private.notify_neighborhood_sighting();

-- ---------------------------------------------------------------------------
-- 활동 알림 트리거
-- ---------------------------------------------------------------------------

create or replace function private.notify_cat_encounter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  encountered_cat public.cats;
  prior_encounter_count integer := 0;
  neighbor record;
begin
  select * into encountered_cat from public.cats where id = new.cat_id;

  if encountered_cat.id is null then
    return new;
  end if;

  select count(*)::integer
  into prior_encounter_count
  from public.cat_encounters
  where cat_id = new.cat_id and id <> new.id;

  if prior_encounter_count > 0 then
    -- 내가 처음 기록한 고양이를 다른 사람이 다시 만남.
    -- 최초 기록자는 created_by이고, 없는 옛 행은 user_id로 떨어진다.
    perform private.enqueue_notification_event(
      coalesce(encountered_cat.created_by, encountered_cat.user_id),
      new.user_id,
      'activity',
      'cat_rediscovery',
      '내가 기록한 고양이를 다시 만났어요',
      encountered_cat.name || ' 기록에 새로운 만남이 추가됐어요.',
      jsonb_build_object('screen', 'catDetail', 'catId', new.cat_id, 'encounterId', new.id)
    );

    return new;
  end if;

  -- 동네에서 처음 기록된 고양이
  for neighbor in
    select distinct hoods.user_id
    from public.user_neighborhoods hoods
    where hoods.is_active
      and new.region_name ilike '%' || hoods.neighborhood_name || '%'
      and hoods.user_id <> new.user_id
  loop
    perform private.enqueue_notification_event(
      neighbor.user_id,
      new.user_id,
      'discovery',
      'neighborhood_new_cat',
      '우리 동네 도감에 새 고양이가 올라왔어요',
      encountered_cat.name || '이(가) ' || new.region_name || '에서 처음 기록됐어요.',
      jsonb_build_object('screen', 'catDetail', 'catId', new.cat_id, 'regionName', new.region_name)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists cat_encounters_notify on public.cat_encounters;
create trigger cat_encounters_notify
  after insert on public.cat_encounters
  for each row execute function private.notify_cat_encounter();

create or replace function private.notify_badge_awarded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  badge_name text;
begin
  select name into badge_name from public.badges where id = new.badge_id;

  perform private.enqueue_notification_event(
    new.user_id,
    null,
    'activity',
    'badge_awarded',
    '새 배지를 받았어요',
    coalesce(badge_name, '새 배지') || ' 배지를 획득했어요.',
    jsonb_build_object('screen', 'myPage', 'badgeId', new.badge_id)
  );

  return new;
end;
$$;

drop trigger if exists user_badges_notify on public.user_badges;
create trigger user_badges_notify
  after insert on public.user_badges
  for each row execute function private.notify_badge_awarded();

-- ---------------------------------------------------------------------------
-- 기기 등록 / 읽음 처리
-- ---------------------------------------------------------------------------

create or replace function public.register_notification_device(
  p_expo_push_token text,
  p_platform text default 'unknown'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if coalesce(btrim(p_expo_push_token), '') = '' then
    raise exception '푸시 토큰이 비어 있습니다.';
  end if;

  -- 같은 토큰이 다른 계정에 남아 있으면(기기 공유·계정 전환) 이전 소유자에게서 떼어 낸다.
  delete from public.notification_devices
  where expo_push_token = p_expo_push_token
    and user_id <> current_user_id;

  insert into public.notification_devices (user_id, expo_push_token, platform, enabled, last_seen_at)
  values (
    current_user_id,
    p_expo_push_token,
    case when p_platform in ('ios', 'android', 'web') then p_platform else 'unknown' end,
    true,
    now()
  )
  on conflict (expo_push_token)
  do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    enabled = true,
    last_seen_at = now(),
    updated_at = now();
end;
$$;

revoke all on function public.register_notification_device(text, text) from public;
revoke all on function public.register_notification_device(text, text) from anon;
grant execute on function public.register_notification_device(text, text) to authenticated;

create or replace function public.mark_my_notifications_read(p_event_ids uuid[] default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.notification_events
  set read_at = now()
  where recipient_id = (select auth.uid())
    and read_at is null
    and (p_event_ids is null or id = any(p_event_ids));

  get diagnostics updated_count = row_count;

  return updated_count;
end;
$$;

revoke all on function public.mark_my_notifications_read(uuid[]) from public;
revoke all on function public.mark_my_notifications_read(uuid[]) from anon;
grant execute on function public.mark_my_notifications_read(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 발송
-- ---------------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

create or replace function private.dispatch_pending_notification_events(p_limit integer default 100)
returns table(processed integer, sent integer, skipped integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_event record;
  event_messages jsonb;
  request_body jsonb := '[]'::jsonb;
  request_id bigint;
  event_ids uuid[] := '{}'::uuid[];
begin
  processed := 0;
  sent := 0;
  skipped := 0;

  for next_event in
    select id, recipient_id, category, type, title, body, data
    from public.notification_events
    where status = 'pending'
    order by created_at asc
    limit greatest(1, least(coalesce(p_limit, 100), 100))
    for update skip locked
  loop
    processed := processed + 1;

    select jsonb_agg(
      jsonb_build_object(
        'to', devices.expo_push_token,
        'title', next_event.title,
        'body', next_event.body,
        'sound', 'default',
        'data', coalesce(next_event.data, '{}'::jsonb) || jsonb_build_object(
          'eventId', next_event.id,
          'category', next_event.category,
          'notificationType', next_event.type
        )
      )
    )
    into event_messages
    from public.notification_devices devices
    where devices.user_id = next_event.recipient_id
      and devices.enabled;

    if event_messages is null or jsonb_array_length(event_messages) = 0 then
      skipped := skipped + 1;
      -- 기기가 없어도 알림함에는 남아야 하므로 행은 지우지 않는다.
      update public.notification_events
      set status = 'skipped',
          error = '푸시를 받을 기기가 없어요'
      where id = next_event.id;
    else
      request_body := request_body || event_messages;
      event_ids := event_ids || next_event.id;
    end if;
  end loop;

  if jsonb_array_length(request_body) > 0 then
    select net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object(
        'accept', 'application/json',
        'accept-encoding', 'gzip, deflate',
        'content-type', 'application/json'
      ),
      body := request_body
    )
    into request_id;

    sent := coalesce(array_length(event_ids, 1), 0);

    update public.notification_events
    set status = 'sent',
        sent_at = now(),
        error = null,
        data = coalesce(data, '{}'::jsonb) || jsonb_build_object('pgNetRequestId', request_id)
    where id = any(event_ids);
  end if;

  return next;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'catdex-notification-dispatch') then
    perform cron.unschedule('catdex-notification-dispatch');
  end if;

  perform cron.schedule(
    'catdex-notification-dispatch',
    '* * * * *',
    'select * from private.dispatch_pending_notification_events(100);'
  );
end;
$$;
