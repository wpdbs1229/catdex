create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_reminder_enabled boolean not null default false,
  daily_reminder_time time not null default time '20:00',
  shared_cat_enabled boolean not null default true,
  achievement_enabled boolean not null default true,
  social_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web', 'unknown')),
  device_name text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('shared_cat', 'achievement', 'collection_like', 'collection_follow')),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_devices_user_enabled
  on public.notification_devices(user_id, enabled, last_seen_at desc);

create index if not exists idx_notification_events_pending_created
  on public.notification_events(status, created_at asc)
  where status = 'pending';

create index if not exists idx_notification_events_recipient_created
  on public.notification_events(recipient_id, created_at desc);

drop trigger if exists notification_settings_set_updated_at on public.notification_settings;
create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

drop trigger if exists notification_devices_set_updated_at on public.notification_devices;
create trigger notification_devices_set_updated_at
  before update on public.notification_devices
  for each row execute function public.set_updated_at();

alter table public.notification_settings enable row level security;
alter table public.notification_devices enable row level security;
alter table public.notification_events enable row level security;

drop policy if exists "notification_settings_select_own" on public.notification_settings;
create policy "notification_settings_select_own"
  on public.notification_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notification_settings_insert_own" on public.notification_settings;
create policy "notification_settings_insert_own"
  on public.notification_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "notification_settings_update_own" on public.notification_settings;
create policy "notification_settings_update_own"
  on public.notification_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notification_devices_select_own" on public.notification_devices;
create policy "notification_devices_select_own"
  on public.notification_devices for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notification_devices_insert_own" on public.notification_devices;
create policy "notification_devices_insert_own"
  on public.notification_devices for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "notification_devices_update_own" on public.notification_devices;
create policy "notification_devices_update_own"
  on public.notification_devices for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notification_devices_delete_own" on public.notification_devices;
create policy "notification_devices_delete_own"
  on public.notification_devices for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notification_events_select_own" on public.notification_events;
create policy "notification_events_select_own"
  on public.notification_events for select
  to authenticated
  using ((select auth.uid()) = recipient_id);

create or replace function private.enqueue_notification_event(
  p_recipient_id uuid,
  p_actor_id uuid,
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
begin
  if p_recipient_id is null then
    return null;
  end if;

  if p_actor_id is not null and p_recipient_id = p_actor_id then
    return null;
  end if;

  insert into public.notification_events (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    data
  )
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb)
  )
  returning id into next_event_id;

  return next_event_id;
end;
$$;

create or replace function private.notify_shared_cat_sighting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_events (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    data
  )
  select distinct
    settings.user_id,
    new.reporter_id,
    'shared_cat',
    '동네에 새 고양이 제보가 있어요',
    new.region_name || '에서 ' || new.coat_type || ' 고양이 제보가 등록됐어요.',
    jsonb_build_object(
      'screen', 'dex',
      'notificationType', 'sharedCat',
      'regionName', new.region_name,
      'sightingId', new.id
    )
  from public.notification_devices devices
  left join public.notification_settings settings on settings.user_id = devices.user_id
  where coalesce(settings.shared_cat_enabled, true)
    and devices.enabled
    and devices.user_id <> new.reporter_id
    and exists (
      select 1
      from public.cat_encounters encounters
      where encounters.user_id = devices.user_id
        and encounters.region_name = new.region_name
    );

  return new;
end;
$$;

create or replace function private.notify_user_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  badge_name text;
begin
  if not coalesce((
    select settings.achievement_enabled
    from public.notification_settings settings
    where settings.user_id = new.user_id
  ), true) then
    return new;
  end if;

  select name into badge_name
  from public.badges
  where id = new.badge_id;

  perform private.enqueue_notification_event(
    new.user_id,
    null,
    'achievement',
    '새 배지를 획득했어요',
    coalesce(badge_name, '새 골목 배지') || ' 배지를 확인해보세요.',
    jsonb_build_object(
      'screen', 'my',
      'notificationType', 'achievement',
      'badgeId', new.badge_id
    )
  );

  return new;
end;
$$;

create or replace function private.notify_collection_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((
    select settings.social_enabled
    from public.notification_settings settings
    where settings.user_id = new.owner_id
  ), true) then
    return new;
  end if;

  perform private.enqueue_notification_event(
    new.owner_id,
    new.liked_by,
    'collection_like',
    '내 도감에 좋아요가 도착했어요',
    '공개 냥도감에 새로운 좋아요가 생겼어요.',
    jsonb_build_object(
      'screen', 'my',
      'notificationType', 'collectionLike',
      'ownerId', new.owner_id,
      'actorId', new.liked_by
    )
  );

  return new;
end;
$$;

create or replace function private.notify_collection_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((
    select settings.social_enabled
    from public.notification_settings settings
    where settings.user_id = new.followed_id
  ), true) then
    return new;
  end if;

  perform private.enqueue_notification_event(
    new.followed_id,
    new.follower_id,
    'collection_follow',
    '새 팔로워가 생겼어요',
    '누군가 내 공개 냥도감을 팔로우했어요.',
    jsonb_build_object(
      'screen', 'my',
      'notificationType', 'collectionFollow',
      'ownerId', new.followed_id,
      'actorId', new.follower_id
    )
  );

  return new;
end;
$$;

drop trigger if exists cat_sightings_enqueue_notification on public.cat_sightings;
create trigger cat_sightings_enqueue_notification
  after insert on public.cat_sightings
  for each row execute function private.notify_shared_cat_sighting();

drop trigger if exists user_badges_enqueue_notification on public.user_badges;
create trigger user_badges_enqueue_notification
  after insert on public.user_badges
  for each row execute function private.notify_user_badge();

drop trigger if exists collection_likes_enqueue_notification on public.collection_likes;
create trigger collection_likes_enqueue_notification
  after insert on public.collection_likes
  for each row execute function private.notify_collection_like();

drop trigger if exists collection_follows_enqueue_notification on public.collection_follows;
create trigger collection_follows_enqueue_notification
  after insert on public.collection_follows
  for each row execute function private.notify_collection_follow();

grant select, insert, update on public.notification_settings to authenticated;
grant select, insert, update, delete on public.notification_devices to authenticated;
grant select on public.notification_events to authenticated;
