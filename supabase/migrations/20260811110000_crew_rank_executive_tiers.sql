-- 직책에 이사·대표를 더한다. 부장(50)에서 끝나면 도감을 절반 이상 채운 사용자에게
-- 더 오를 곳이 없다. 대표는 totalDexCount(100)와 맞춰 "도감 완성"을 종점으로 삼는다.

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
    when coalesce(p_count, 0) >= 1 then '주임'
    else '사원'
  end;
$$;

-- get_my_crew_status의 경계 배열도 함께 늘린다.
create or replace function public.get_my_crew_status()
returns table(collected integer, peak integer, rank text, next_rank text, next_threshold integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  thresholds integer[] := array[1, 10, 30, 50, 75, 100];
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
