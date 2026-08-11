-- 출근 기록. 앱을 연 날을 하루 단위로 남긴다.
--
-- 연속(streak)이 아니라 누적이다. 길고양이는 매일 만날 수 있는 대상이 아니라
-- 사용자가 통제할 수 없는 이유로 끊기는데, 그때 숫자가 줄면 복귀가 아니라
-- 이탈을 부른다. 직책을 최고 기록으로 둔 것과 같은 이유다.

create table if not exists public.user_attendance (
  user_id uuid not null references auth.users(id) on delete cascade,
  attended_on date not null default current_date,
  primary key (user_id, attended_on)
);

alter table public.user_attendance enable row level security;

create policy "user_attendance_select_own"
  on public.user_attendance for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_attendance_insert_own"
  on public.user_attendance for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- 홈 화면이 한 번에 쓰는 요약. 오늘 출근을 남기고 인사고과 지표를 함께 돌려준다.
-- 날짜는 한국 시간 기준으로 끊는다(자정 직후 접속이 전날로 잡히지 않게).
create or replace function public.check_in_and_get_status()
returns table(
  collected integer,
  peak integer,
  rank text,
  next_rank text,
  next_threshold integer,
  attendance_days integer,
  top_reunion_cat text,
  top_reunion_count integer
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

  return next;
end;
$$;

revoke all on function public.check_in_and_get_status() from public;
revoke all on function public.check_in_and_get_status() from anon;
grant execute on function public.check_in_and_get_status() to authenticated;
