-- 뱃지 23종과 동네 리더보드를 제품 범위에서 제외한다.
-- 지급 규칙(000016)과 리더보드 RPC(000024, 000026)를 통째로 걷어낸다.
--
-- 파일명이 000038이 아니라 타임스탬프인 이유: 마이그레이션은 파일명 사전순으로 적용되는데
-- '0'이 '2'보다 앞서서 000038은 20260810090100_notification_v2.sql보다 먼저 돈다.
-- 그러면 아래에서 좁힌 notification_events 제약을 알림 v2가 다시 넓혀 버린다.

-- 1. 지급 트리거. 살아남는 테이블에 붙어 있어서 테이블 drop의 cascade로는 지워지지 않는다.
drop trigger if exists cats_award_badges on public.cats;
drop trigger if exists user_cat_collections_award_badges on public.user_cat_collections;
drop trigger if exists cat_encounters_award_badges on public.cat_encounters;
drop trigger if exists cat_sightings_award_badges on public.cat_sightings;
drop trigger if exists reports_award_badges on public.reports;
drop trigger if exists featured_cats_award_badges on public.featured_cats;
drop trigger if exists community_comments_award_badges on public.community_comments;

-- 2. 테이블. RLS 정책·인덱스·grant와 user_badges_notify 트리거가 함께 사라진다.
--    함수보다 먼저 지워야 한다. 트리거가 함수에 의존하므로 순서가 반대면 drop function이 막힌다.
drop table if exists public.user_badges cascade;
drop table if exists public.badges cascade;

-- 3. 지급·알림 함수
drop function if exists private.refresh_user_badges_from_cat();
drop function if exists private.refresh_user_badges_from_collection();
drop function if exists private.refresh_user_badges_from_encounter();
drop function if exists private.refresh_user_badges_from_sighting();
drop function if exists private.refresh_user_badges_from_report();
drop function if exists private.refresh_user_badges_from_featured_cat();
drop function if exists private.refresh_user_badges_from_community_comment();
drop function if exists private.refresh_user_badges(uuid);
drop function if exists private.award_badge(uuid, text);
drop function if exists private.notify_badge_awarded();

-- 4. 알림 타입에서 badge_awarded를 뺀다.
--    남은 행을 먼저 지워야 제약을 좁힐 수 있다.
delete from public.notification_events where type = 'badge_awarded';

alter table public.notification_events
  drop constraint if exists notification_events_type_check;

alter table public.notification_events
  add constraint notification_events_type_check check (
    type in (
      'neighborhood_sighting',
      'neighborhood_new_cat',
      'cat_rediscovery',
      'post_reaction',
      'campaign'
    )
  );

-- 5. 동네 리더보드
drop function if exists public.get_neighborhood_leaderboard(text, integer, integer);
