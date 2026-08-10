-- 이전 알림 스택 철거.
-- 시안(마이페이지_알림)의 스위치 세 개와 분류 체계가 달라 새로 만든다. docs/notifications.md 참고.
-- 순서가 중요하다: 크론 -> 트리거 -> 함수 -> 테이블. 트리거를 남기면 테이블이 사라진 뒤
-- cat_encounters/cat_sightings insert가 통째로 실패한다.

-- 1. 크론 정지
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'catdex-notification-dispatch') then
      perform cron.unschedule('catdex-notification-dispatch');
    end if;

    if exists (select 1 from cron.job where jobname = 'catdex-weekly-notification-summary') then
      perform cron.unschedule('catdex-weekly-notification-summary');
    end if;
  end if;
end;
$$;

-- 2. 트리거 제거
drop trigger if exists cat_encounters_enqueue_activity_notification on public.cat_encounters;
drop trigger if exists cat_sightings_enqueue_notification on public.cat_sightings;
drop trigger if exists user_badges_enqueue_notification on public.user_badges;
drop trigger if exists notification_settings_set_updated_at on public.notification_settings;
drop trigger if exists notification_devices_set_updated_at on public.notification_devices;

-- collection_likes / collection_follows는 테이블이 만들어진 적이 없어 트리거도 없지만,
-- 다른 환경에 남아 있을 수 있으므로 테이블이 있을 때만 지운다.
do $$
begin
  if to_regclass('public.collection_likes') is not null then
    drop trigger if exists collection_likes_enqueue_notification on public.collection_likes;
  end if;

  if to_regclass('public.collection_follows') is not null then
    drop trigger if exists collection_follows_enqueue_notification on public.collection_follows;
  end if;
end;
$$;

-- 3. 함수 제거
drop function if exists private.notify_cat_encounter_activity();
drop function if exists private.notify_shared_cat_sighting();
drop function if exists private.notify_collection_like();
drop function if exists private.notify_collection_follow();
drop function if exists private.notify_user_badge();
drop function if exists private.enqueue_weekly_notification_summaries();
drop function if exists private.dispatch_pending_notification_events(integer);
drop function if exists private.enqueue_notification_event(uuid, uuid, text, text, text, jsonb);
drop function if exists public.register_notification_device(text, text);

-- 4. 테이블 제거
drop table if exists public.notification_events;
drop table if exists public.notification_devices;
drop table if exists public.notification_settings;
