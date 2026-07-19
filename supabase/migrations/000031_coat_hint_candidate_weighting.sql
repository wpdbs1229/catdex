-- 후보 정렬에 털색 일치 가중치 추가
--
-- CatVision이 누끼 픽셀의 색 분포로 추정한 털색 후보(coat hints)를 관찰에
-- 저장하고, generate_cat_match_candidates가 cats.type과 일치하는 후보를
-- 상위로 끌어올린다. 힌트는 자동 판별이 아니라 정렬 가중치로만 쓰인다.

alter table public.cat_observations
  add column if not exists coat_hints text[] not null default '{}';

comment on column public.cat_observations.coat_hints is
  '누끼 색 분포로 추정한 털색 후보 (예: {치즈냥,삼색이}) — 후보 정렬 힌트 전용';

-- 털색 가중 방식을 match_method로 구분 기록할 수 있게 허용 값을 확장한다.
alter table public.cat_match_candidates
  drop constraint if exists cat_match_candidates_match_method_check;

alter table public.cat_match_candidates
  add constraint cat_match_candidates_match_method_check
  check (match_method in ('neighborhood_recent', 'neighborhood_recent_coat', 'visual_embedding', 'manual'));

-- 시그니처가 바뀌므로 기존 함수를 제거하고 다시 만든다.
-- (남겨두면 3인자 호출이 두 오버로드 사이에서 모호해진다.)
drop function if exists public.generate_cat_match_candidates(uuid, text[], integer);

create or replace function public.generate_cat_match_candidates(
  p_observation_id uuid,
  p_region_names text[] default '{}',
  p_coat_hints text[] default '{}',
  p_limit integer default 5
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_observation public.cat_observations;
  candidate_region_names text[];
  effective_coat_hints text[];
  candidate_limit integer := least(greatest(coalesce(p_limit, 5), 1), 10);
  generated_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_observation_id is null then
    raise exception 'Observation is required' using errcode = '22023';
  end if;

  select observations.*
  into current_observation
  from public.cat_observations observations
  where observations.id = p_observation_id
    and observations.user_id = current_user_id;

  if not found then
    raise exception 'Observation not found' using errcode = 'P0002';
  end if;

  if current_observation.status <> 'pending' then
    raise exception 'Observation is already resolved' using errcode = '22023';
  end if;

  select array_agg(distinct trim(names.region_name))
  into candidate_region_names
  from unnest(
    coalesce(p_region_names, '{}'::text[])
      || array[current_observation.region_name]
  ) as names(region_name)
  where nullif(trim(names.region_name), '') is not null;

  -- 파라미터 힌트가 비어 있으면 관찰에 저장된 힌트를 사용한다(재생성 경로).
  effective_coat_hints := case
    when coalesce(array_length(p_coat_hints, 1), 0) > 0 then p_coat_hints
    else coalesce(current_observation.coat_hints, '{}'::text[])
  end;

  delete from public.cat_match_candidates candidates
  where candidates.observation_id = p_observation_id;

  with region_candidates as (
    select
      cat_regions.cat_id,
      max(cat_regions.last_seen_at) as last_seen_at,
      sum(cat_regions.encounter_count)::integer as region_encounter_count,
      bool_or(regions.name = current_observation.region_name) as exact_region_name
    from public.cat_regions cat_regions
    join public.regions regions on regions.id = cat_regions.region_id
    where regions.name = any(candidate_region_names)
    group by cat_regions.cat_id
  ),
  candidate_evidence as (
    select
      region_candidates.*,
      cats.number,
      cats.type = any(effective_coat_hints) as coat_match,
      exists (
        select 1
        from public.user_cat_collections collections
        where collections.user_id = current_user_id
          and collections.cat_id = region_candidates.cat_id
      ) as collected_by_user
    from region_candidates
    join public.cats cats on cats.id = region_candidates.cat_id
  ),
  ranked_candidates as (
    select
      candidate_evidence.*,
      row_number() over (
        order by
          candidate_evidence.collected_by_user desc,
          candidate_evidence.exact_region_name desc,
          candidate_evidence.coat_match desc,
          candidate_evidence.last_seen_at desc,
          candidate_evidence.region_encounter_count desc,
          candidate_evidence.number asc
      )::integer as candidate_rank
    from candidate_evidence
  ),
  inserted_candidates as (
    insert into public.cat_match_candidates (
      observation_id,
      cat_id,
      score,
      rank,
      reason,
      match_method,
      model_version
    )
    select
      p_observation_id,
      ranked_candidates.cat_id,
      least(
        0.99,
        0.50
          + case when ranked_candidates.collected_by_user then 0.15 else 0 end
          + case when ranked_candidates.exact_region_name then 0.10 else 0.05 end
          + case when ranked_candidates.coat_match then 0.08 else 0 end
          + case
              when ranked_candidates.last_seen_at >= current_date - 30 then 0.15
              when ranked_candidates.last_seen_at >= current_date - 180 then 0.10
              else 0.05
            end
          + least(ranked_candidates.region_encounter_count, 20) * 0.005
      )::double precision,
      ranked_candidates.candidate_rank,
      concat_ws(
        ' · ',
        case
          when ranked_candidates.collected_by_user then '내 도감에도 있는 고양이'
          else '현재 동네의 기존 고양이'
        end,
        case when ranked_candidates.coat_match then '털색이 비슷해요' end,
        '최근 ' || to_char(ranked_candidates.last_seen_at, 'YYYY.MM.DD'),
        '동네 기록 ' || ranked_candidates.region_encounter_count || '회'
      ),
      case when ranked_candidates.coat_match then 'neighborhood_recent_coat' else 'neighborhood_recent' end,
      null
    from ranked_candidates
    where ranked_candidates.candidate_rank <= candidate_limit
    returning id
  )
  select count(*)::integer
  into generated_count
  from inserted_candidates;

  return generated_count;
end;
$$;

revoke execute on function public.generate_cat_match_candidates(uuid, text[], text[], integer) from public, anon;
grant execute on function public.generate_cat_match_candidates(uuid, text[], text[], integer) to authenticated;
