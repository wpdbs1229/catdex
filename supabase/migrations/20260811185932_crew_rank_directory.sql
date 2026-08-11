-- 승진 안내 모달이 쓰는 지부 정원 현황.
--
-- 지금까지 서버는 각 사용자의 법정동 이름만 알고 시·도는 몰랐다. 사원증의
-- "서울지부"는 화면에서 만들어 쓰는 값이라 집계에 쓸 수 없었다. 시·도는 이미
-- 올리고 있는 법정동보다 넓은 범위라 새로 드러나는 정보는 없다.

alter table public.user_neighborhoods
  add column if not exists city text;

-- 같은 지부 사람을 셀 때 훑는 열이다.
create index if not exists idx_user_neighborhoods_city
  on public.user_neighborhoods (city)
  where is_active;

-- 인자를 하나 늘린다. 기본값으로 덧붙이면 2인자 호출이 어느 쪽인지 모호해져
-- PostgREST가 골라내지 못하므로(과거 match_candidate 오버로드와 같은 문제)
-- 옛 함수를 내리고 새로 만든다.
drop function if exists public.sync_my_neighborhoods(text[], text);

create or replace function public.sync_my_neighborhoods(
  p_names text[],
  p_active_name text default null,
  p_city text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  clean_names text[];
  clean_city text := nullif(btrim(coalesce(p_city, '')), '');
begin
  select array_agg(distinct btrim(name))
  into clean_names
  from unnest(coalesce(p_names, '{}'::text[])) as name
  where btrim(name) <> '';

  clean_names := coalesce(clean_names, '{}'::text[]);

  if array_length(clean_names, 1) > 5 then
    raise exception '동네는 최대 5개까지 저장할 수 있어요.';
  end if;

  delete from public.user_neighborhoods
  where user_id = (select auth.uid())
    and neighborhood_name <> all (clean_names);

  insert into public.user_neighborhoods (user_id, neighborhood_name, is_active, city)
  select
    (select auth.uid()),
    name,
    name is not distinct from btrim(coalesce(p_active_name, '')),
    -- 시·도는 활성 동네에만 붙인다. 나머지 동네의 시·도는 이 호출이 알지 못한다.
    case when name is not distinct from btrim(coalesce(p_active_name, '')) then clean_city end
  from unnest(clean_names) as name
  on conflict (user_id, neighborhood_name)
  do update set
    is_active = excluded.is_active,
    -- 이번 호출이 시·도를 모르면 already 저장된 값을 지우지 않는다.
    city = coalesce(excluded.city, public.user_neighborhoods.city),
    updated_at = now();
end;
$$;

revoke all on function public.sync_my_neighborhoods(text[], text, text) from public;
revoke all on function public.sync_my_neighborhoods(text[], text, text) from anon;
grant execute on function public.sync_my_neighborhoods(text[], text, text) to authenticated;

/**
 * 내 지부의 직책별 인원수.
 *
 * 다른 사람의 프로필을 읽어야 하므로 security definer지만, 밖으로 나가는 것은
 * 직책별 '수'뿐이다. 이름·아이디는 어떤 경우에도 돌려주지 않는다.
 *
 * 직책은 현재 마릿수가 아니라 최고 기록(collected_peak)으로 정한다. 중복 개체를
 * 병합해 마릿수가 줄어도 강등되지 않게 하기 위함이고, 이 화면이 사용자에게
 * 알려 주려는 규칙이기도 하다.
 */
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
    values ('대표', 100), ('이사', 75), ('부장', 50), ('과장', 30), ('대리', 10), ('주임', 1), ('사원', 0)
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

revoke all on function public.crew_rank_directory() from public;
revoke all on function public.crew_rank_directory() from anon;
grant execute on function public.crew_rank_directory() to authenticated;
