-- 사원증 직책(게이미피케이션).
-- 수집한 고양이 마릿수로 정한다. 기준을 단순하게 두는 대신, 중복 개체 병합으로
-- 마릿수가 줄어도 직책이 내려가지 않도록 "최고 기록"을 따로 저장한다.
-- (cat_merge는 000032에서 이미 도입된 정상 동작이라 강등이 실제로 일어난다.)

alter table public.profiles
  add column if not exists collected_peak integer not null default 0;

-- 직책 경계. 여기만 고치면 앱·서버가 함께 바뀐다.
create or replace function public.crew_rank_for_count(p_count integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_count, 0) >= 50 then '부장'
    when coalesce(p_count, 0) >= 30 then '과장'
    when coalesce(p_count, 0) >= 10 then '대리'
    when coalesce(p_count, 0) >= 1 then '주임'
    else '사원'
  end;
$$;

grant execute on function public.crew_rank_for_count(integer) to authenticated;

-- 수집이 늘 때 최고 기록을 갱신하고, 직책이 올라가면 알린다.
create or replace function private.sync_crew_rank()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  previous_peak integer;
  previous_rank text;
  next_rank text;
begin
  select count(*)::integer
  into current_count
  from public.user_cat_collections
  where user_id = new.user_id;

  select collected_peak into previous_peak
  from public.profiles
  where id = new.user_id;

  previous_peak := coalesce(previous_peak, 0);

  if current_count <= previous_peak then
    return new;
  end if;

  previous_rank := public.crew_rank_for_count(previous_peak);
  next_rank := public.crew_rank_for_count(current_count);

  update public.profiles
  set collected_peak = current_count
  where id = new.user_id;

  if next_rank is distinct from previous_rank then
    perform private.enqueue_notification_event(
      new.user_id,
      null,
      'activity',
      'rank_promoted',
      '승진했어요!',
      '고양이 ' || current_count || '마리를 모아 ' || next_rank || '이(가) 됐어요.',
      jsonb_build_object('screen', 'home', 'rank', next_rank, 'collected', current_count)
    );
  end if;

  return new;
end;
$$;

alter table public.notification_events
  drop constraint if exists notification_events_type_check;

alter table public.notification_events
  add constraint notification_events_type_check
  check (
    type in (
      'neighborhood_sighting',
      'neighborhood_new_cat',
      'cat_rediscovery',
      'badge_awarded',
      'post_reaction',
      'campaign',
      'rank_promoted'
    )
  );

drop trigger if exists user_cat_collections_sync_crew_rank on public.user_cat_collections;
create trigger user_cat_collections_sync_crew_rank
  after insert on public.user_cat_collections
  for each row execute function private.sync_crew_rank();

-- 이미 수집한 사용자들의 최고 기록을 채운다.
update public.profiles p
set collected_peak = greatest(
  p.collected_peak,
  coalesce((select count(*) from public.user_cat_collections c where c.user_id = p.id), 0)
);

-- 홈 화면이 쓰는 요약. 현재 마릿수와 직책, 다음 직책까지 남은 수를 한 번에 준다.
create or replace function public.get_my_crew_status()
returns table(collected integer, peak integer, rank text, next_rank text, next_threshold integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  thresholds integer[] := array[1, 10, 30, 50];
  boundary integer;
begin
  select count(*)::integer into collected
  from public.user_cat_collections
  where user_id = (select auth.uid());

  select coalesce(p.collected_peak, 0) into peak
  from public.profiles p
  where p.id = (select auth.uid());

  peak := greatest(coalesce(peak, 0), coalesce(collected, 0));
  rank := public.crew_rank_for_count(peak);

  next_threshold := null;
  next_rank := null;

  foreach boundary in array thresholds loop
    if peak < boundary then
      next_threshold := boundary;
      next_rank := public.crew_rank_for_count(boundary);
      exit;
    end if;
  end loop;

  return next;
end;
$$;

revoke all on function public.get_my_crew_status() from public;
revoke all on function public.get_my_crew_status() from anon;
grant execute on function public.get_my_crew_status() to authenticated;
