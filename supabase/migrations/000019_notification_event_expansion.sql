alter table public.notification_settings
  add column if not exists cat_update_enabled boolean not null default true,
  add column if not exists social_enabled boolean not null default true,
  add column if not exists weekly_summary_enabled boolean not null default true;

alter table public.notification_events
  drop constraint if exists notification_events_type_check;

alter table public.notification_events
  add constraint notification_events_type_check
  check (
    type in (
      'shared_cat',
      'achievement',
      'collection_like',
      'collection_follow',
      'cat_rediscovery',
      'rare_neighborhood_cat',
      'weekly_summary'
    )
  );

create index if not exists idx_notification_events_weekly_summary_dedupe
  on public.notification_events(recipient_id, type, created_at desc)
  where type = 'weekly_summary';

create or replace function private.notify_cat_encounter_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  encountered_cat public.cats;
  prior_encounter_count integer := 0;
  region_has_prior_cats boolean := false;
begin
  if coalesce(new.is_public, true) is not true then
    return new;
  end if;

  select *
  into encountered_cat
  from public.cats
  where id = new.cat_id;

  if encountered_cat.id is null then
    return new;
  end if;

  select count(*)::integer
  into prior_encounter_count
  from public.cat_encounters
  where cat_id = new.cat_id
    and id <> new.id;

  if prior_encounter_count > 0 then
    perform private.enqueue_notification_event(
      coalesce(encountered_cat.created_by, encountered_cat.user_id),
      new.user_id,
      'cat_rediscovery',
      '내가 기록한 고양이를 다시 만났어요',
      encountered_cat.name || ' 기록에 새로운 다시 만남이 추가됐어요.',
      jsonb_build_object(
        'screen', 'dex',
        'notificationType', 'catRediscovery',
        'catId', new.cat_id,
        'encounterId', new.id,
        'regionName', new.region_name
      )
    )
    where coalesce((
      select settings.cat_update_enabled
      from public.notification_settings settings
      where settings.user_id = coalesce(encountered_cat.created_by, encountered_cat.user_id)
    ), true);

    return new;
  end if;

  select exists (
    select 1
    from public.cat_encounters encounters
    where encounters.region_name = new.region_name
      and encounters.id <> new.id
  )
  into region_has_prior_cats;

  if encountered_cat.rarity >= 4 or not region_has_prior_cats then
    insert into public.notification_events (
      recipient_id,
      actor_id,
      type,
      title,
      body,
      data
    )
    select distinct
      devices.user_id,
      new.user_id,
      'rare_neighborhood_cat',
      case
        when encountered_cat.rarity >= 4 then '동네에 희귀 고양이가 기록됐어요'
        else '동네 첫 고양이 기록이 생겼어요'
      end,
      new.region_name || '에서 ' || encountered_cat.name || ' 기록이 추가됐어요.',
      jsonb_build_object(
        'screen', 'dex',
        'notificationType', 'rareNeighborhoodCat',
        'catId', new.cat_id,
        'encounterId', new.id,
        'regionName', new.region_name,
        'rarity', encountered_cat.rarity
      )
    from public.notification_devices devices
    left join public.notification_settings settings on settings.user_id = devices.user_id
    where coalesce(settings.shared_cat_enabled, true)
      and devices.enabled
      and devices.user_id <> new.user_id
      and exists (
        select 1
        from public.cat_encounters encounters
        where encounters.user_id = devices.user_id
          and encounters.region_name = new.region_name
          and encounters.id <> new.id
      )
      and not exists (
        select 1
        from public.notification_events existing
        where existing.recipient_id = devices.user_id
          and existing.actor_id = new.user_id
          and existing.type = 'rare_neighborhood_cat'
          and existing.data->>'catId' = new.cat_id::text
          and existing.created_at >= now() - interval '1 day'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists cat_encounters_enqueue_activity_notification on public.cat_encounters;
create trigger cat_encounters_enqueue_activity_notification
  after insert on public.cat_encounters
  for each row execute function private.notify_cat_encounter_activity();

create or replace function private.notify_shared_cat_sighting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_first_region_signal boolean := false;
  base_rarity integer := 3;
begin
  if to_regprocedure('public.cat_type_base_rarity(text)') is not null then
    select public.cat_type_base_rarity(new.coat_type)
    into base_rarity;
  else
    base_rarity := case new.coat_type
      when '삼색이' then 4
      when '턱시도' then 3
      when '검은냥' then 3
      else 2
    end;
  end if;

  select not exists (
    select 1
    from public.cat_encounters encounters
    where encounters.region_name = new.region_name
  )
  into is_first_region_signal;

  if base_rarity < 4 and not is_first_region_signal then
    return new;
  end if;

  insert into public.notification_events (
    recipient_id,
    actor_id,
    type,
    title,
    body,
    data
  )
  select distinct
    devices.user_id,
    new.reporter_id,
    'shared_cat',
    case
      when base_rarity >= 4 then '동네에 눈에 띄는 고양이 제보가 있어요'
      else '동네 첫 고양이 제보가 들어왔어요'
    end,
    new.region_name || '에서 ' || new.coat_type || ' 고양이 제보가 등록됐어요.',
    jsonb_build_object(
      'screen', 'dex',
      'notificationType', 'sharedCat',
      'regionName', new.region_name,
      'sightingId', new.id,
      'coatType', new.coat_type
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

drop trigger if exists cat_sightings_enqueue_notification on public.cat_sightings;
create trigger cat_sightings_enqueue_notification
  after insert on public.cat_sightings
  for each row execute function private.notify_shared_cat_sighting();

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

do $$
begin
  if to_regclass('public.collection_likes') is not null then
    drop trigger if exists collection_likes_enqueue_notification on public.collection_likes;
    create trigger collection_likes_enqueue_notification
      after insert on public.collection_likes
      for each row execute function private.notify_collection_like();
  end if;

  if to_regclass('public.collection_follows') is not null then
    drop trigger if exists collection_follows_enqueue_notification on public.collection_follows;
    create trigger collection_follows_enqueue_notification
      after insert on public.collection_follows
      for each row execute function private.notify_collection_follow();
  end if;
end;
$$;

create or replace function private.enqueue_weekly_notification_summaries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer := 0;
begin
  with weekly_activity as (
    select
      settings.user_id,
      coalesce(encounters.encounter_count, 0) as encounter_count,
      coalesce(sightings.sighting_count, 0) as sighting_count,
      coalesce(badges.badge_count, 0) as badge_count
    from public.notification_settings settings
    left join lateral (
      select count(*)::integer as encounter_count
      from public.cat_encounters encounters
      where encounters.user_id = settings.user_id
        and encounters.created_at >= now() - interval '7 days'
    ) encounters on true
    left join lateral (
      select count(*)::integer as sighting_count
      from public.cat_sightings sightings
      where sightings.reporter_id = settings.user_id
        and sightings.created_at >= now() - interval '7 days'
    ) sightings on true
    left join lateral (
      select count(*)::integer as badge_count
      from public.user_badges badges
      where badges.user_id = settings.user_id
        and badges.achieved_at >= current_date - 7
    ) badges on true
    where settings.weekly_summary_enabled
      and exists (
        select 1
        from public.notification_devices devices
        where devices.user_id = settings.user_id
          and devices.enabled
      )
  ),
  inserted as (
    insert into public.notification_events (
      recipient_id,
      actor_id,
      type,
      title,
      body,
      data
    )
    select
      activity.user_id,
      null,
      'weekly_summary',
      '이번 주 냥도감 리포트',
      '기록 ' || (activity.encounter_count + activity.sighting_count) || '개, 새 배지 ' || activity.badge_count || '개가 쌓였어요.',
      jsonb_build_object(
        'screen', 'my',
        'notificationType', 'weeklySummary',
        'encounterCount', activity.encounter_count,
        'sightingCount', activity.sighting_count,
        'badgeCount', activity.badge_count
      )
    from weekly_activity activity
    where activity.encounter_count + activity.sighting_count + activity.badge_count > 0
      and not exists (
        select 1
        from public.notification_events existing
        where existing.recipient_id = activity.user_id
          and existing.type = 'weekly_summary'
          and existing.created_at >= now() - interval '6 days'
      )
    returning id
  )
  select count(*)::integer
  into inserted_count
  from inserted;

  return inserted_count;
end;
$$;

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
    select id, recipient_id, type, title, body, data
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
      update public.notification_events
      set status = 'skipped',
          error = 'No enabled Expo push token for recipient'
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
  if exists (
    select 1
    from cron.job
    where jobname = 'catdex-notification-dispatch'
  ) then
    perform cron.unschedule('catdex-notification-dispatch');
  end if;

  perform cron.schedule(
    'catdex-notification-dispatch',
    '* * * * *',
    'select * from private.dispatch_pending_notification_events(100);'
  );

  if exists (
    select 1
    from cron.job
    where jobname = 'catdex-weekly-notification-summary'
  ) then
    perform cron.unschedule('catdex-weekly-notification-summary');
  end if;

  perform cron.schedule(
    'catdex-weekly-notification-summary',
    '0 0 * * 1',
    'select private.enqueue_weekly_notification_summaries();'
  );
end;
$$;
