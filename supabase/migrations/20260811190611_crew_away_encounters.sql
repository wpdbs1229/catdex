-- 인사고과의 출장 줄.
--
-- 출장 = 저장된 근거지(user_neighborhoods) 밖에서 남긴 만남. 홈이 이미 부르는
-- check_in_and_get_status에 얹어 왕복을 늘리지 않는다. 반환 열이 늘어 타입이
-- 바뀌므로 내렸다 다시 만든다.

drop function if exists public.check_in_and_get_status();

create or replace function public.check_in_and_get_status()
returns table(
  collected integer,
  peak integer,
  rank text,
  next_rank text,
  next_threshold integer,
  attendance_days integer,
  top_reunion_cat text,
  top_reunion_count integer,
  away_encounters integer,
  away_region_count integer,
  away_latest_region text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  thresholds integer[] := array[1, 10, 30, 50, 75, 100];
  boundary integer;
  current_user_id uuid := (select auth.uid());
  today date := (now() at time zone 'Asia/Seoul')::date;
  -- 이 날짜부터의 만남만 '어디서 만났는지'를 믿을 수 있다.
  -- 그전에는 만난 곳이 아니라 근거지가 찍혔고 동네 이름 형식도 제각각이라
  -- ('부천시 중동 근처' / '성수동' / '태평로1가') 근거지와 글자가 맞을 일이 없다.
  -- 그대로 대조하면 전부 출장이 되어 실제 출장과 구분이 사라진다.
  -- 클라이언트의 ENCOUNTER_LOCATION_TRUSTED_SINCE와 같은 값을 쓴다.
  location_trusted_since date := date '2026-08-11';
begin
  if current_user_id is null then
    return;
  end if;

  insert into public.user_attendance (user_id, attended_on)
  values (current_user_id, today)
  on conflict (user_id, attended_on) do nothing;

  select count(*)::integer into attendance_days
  from public.user_attendance
  where user_id = current_user_id;

  select count(*)::integer into collected
  from public.user_cat_collections
  where user_id = current_user_id;

  select coalesce(p.collected_peak, 0) into peak
  from public.profiles p
  where p.id = current_user_id;

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

  -- 가장 많이 다시 만난 고양이. 재회가 없으면 비워 둔다.
  select cats.name, collections.encounter_count
  into top_reunion_cat, top_reunion_count
  from public.user_cat_collections collections
  join public.cats cats on cats.id = collections.cat_id
  where collections.user_id = current_user_id
    and collections.encounter_count >= 2
  order by collections.encounter_count desc, collections.last_seen_at desc
  limit 1;

  -- 근거지 밖에서 남긴 만남
  select
    count(*)::integer,
    count(distinct encounters.region_name)::integer
  into away_encounters, away_region_count
  from public.cat_encounters encounters
  where encounters.user_id = current_user_id
    and encounters.seen_at >= location_trusted_since
    and encounters.region_name <> '동네 미지정'
    and not exists (
      select 1
      from public.user_neighborhoods un
      where un.user_id = current_user_id
        and un.neighborhood_name = encounters.region_name
    );

  select encounters.region_name
  into away_latest_region
  from public.cat_encounters encounters
  where encounters.user_id = current_user_id
    and encounters.seen_at >= location_trusted_since
    and encounters.region_name <> '동네 미지정'
    and not exists (
      select 1
      from public.user_neighborhoods un
      where un.user_id = current_user_id
        and un.neighborhood_name = encounters.region_name
    )
  order by encounters.seen_at desc, encounters.created_at desc
  limit 1;

  return next;
end;
$$;

revoke all on function public.check_in_and_get_status() from public;
revoke all on function public.check_in_and_get_status() from anon;
grant execute on function public.check_in_and_get_status() to authenticated;
