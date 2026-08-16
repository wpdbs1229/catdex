-- 주임 승진 기준을 1마리 -> 2마리로 올린다.
--
-- 온보딩의 교육용 고객(보리)이 첫 수집으로 들어오면서, 튜토리얼만 마쳐도
-- 곧장 주임으로 승진해 버렸다. 첫 승진은 연수가 아니라 실제 첫 고객
-- 모집으로 이루게 한다.

create or replace function public.crew_rank_for_count(p_count integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_count, 0) >= 100 then '대표'
    when coalesce(p_count, 0) >= 75 then '이사'
    when coalesce(p_count, 0) >= 50 then '부장'
    when coalesce(p_count, 0) >= 30 then '과장'
    when coalesce(p_count, 0) >= 10 then '대리'
    when coalesce(p_count, 0) >= 2 then '주임'
    else '사원'
  end;
$$;

-- check_in_and_get_status의 경계 배열도 같이 바꾼다. 본문은
-- 20260811190611_crew_away_encounters.sql 그대로, thresholds만 다르다.
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
set search_path to ''
as $function$
declare
  thresholds integer[] := array[2, 10, 30, 50, 75, 100];
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
$function$;

-- 승진 사다리 안내(지부 정원 현황)의 경계도 맞춘다. 본문은
-- 20260811185932_crew_rank_directory.sql 그대로, ladder의 주임 값만 다르다.
create or replace function public.crew_rank_directory()
returns table(
  rank text,
  threshold integer,
  member_count integer,
  is_my_rank boolean,
  branch_city text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  my_city text;
  my_rank text;
begin
  if me is null then
    return;
  end if;

  select un.city into my_city
  from public.user_neighborhoods un
  where un.user_id = me and un.is_active and un.city is not null
  limit 1;

  select public.crew_rank_for_count(p.collected_peak) into my_rank
  from public.profiles p
  where p.id = me;

  return query
  with ladder(rank_name, cut) as (
    values ('대표', 100), ('이사', 75), ('부장', 50), ('과장', 30), ('대리', 10), ('주임', 2), ('사원', 0)
  ),
  -- 한 사람이 같은 지부에 동네를 여러 개 둘 수 있으므로 사람 단위로 한 번만 센다.
  branch_members as (
    select p.id, public.crew_rank_for_count(p.collected_peak) as rank_name
    from public.profiles p
    where my_city is not null
      and exists (
        select 1
        from public.user_neighborhoods un
        where un.user_id = p.id and un.is_active and un.city = my_city
      )
  )
  select
    l.rank_name,
    l.cut,
    (select count(*)::integer from branch_members b where b.rank_name = l.rank_name),
    l.rank_name is not distinct from my_rank,
    my_city
  from ladder l
  order by l.cut desc;
end;
$$;
