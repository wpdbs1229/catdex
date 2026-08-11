-- 20260811090000_crew_rank.sql이 notification_events 제약을 다시 쓰면서
-- 20260811000000에서 빼낸 badge_awarded를 되살렸다. 뱃지는 제품에서 빠졌으므로
-- 다시 제외하고, 대신 rank_promoted만 더한 집합으로 확정한다.

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
      'campaign',
      'rank_promoted'
    )
  );
