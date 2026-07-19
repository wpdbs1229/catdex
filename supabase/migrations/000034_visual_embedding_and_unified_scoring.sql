-- 후보 정렬 개선: 시각 임베딩 유사도 + 점수 통합 정렬
--
-- 1) 임베딩 저장: CatVision이 누끼에서 계산한 Vision Feature Print
--    (온디바이스, 외부 API 없음)를 관찰과 개체에 저장한다. 차원이 OS
--    버전에 따라 다를 수 있어 고정 차원(pgvector) 대신 float8[]과
--    버전 문자열로 저장하고, 버전이 같을 때만 비교한다.
-- 2) 관찰이 개체로 확정(new_cat/linked)되면 트리거가 개체의 대표
--    임베딩을 최신 관찰 것으로 갱신한다.
-- 3) 후보 정렬을 불리언 우선순위(내 수집 > 구역 > ...)에서 단일 점수
--    합산으로 통합한다. 이웃이 등록한 고양이도 근거가 충분하면 위로
--    올라올 수 있다.

-- 1) 임베딩 컬럼 -------------------------------------------------------------

alter table public.cat_observations
  add column if not exists embedding double precision[],
  add column if not exists embedding_version text;

alter table public.cats
  add column if not exists embedding double precision[],
  add column if not exists embedding_version text;

comment on column public.cats.embedding is
  '대표 시각 임베딩(Vision Feature Print) — 후보 정렬 유사도 전용, 최신 확정 관찰 기준';

-- 코사인 유사도 (차원 불일치·null이면 null)
-- generate_cat_match_candidates가 security invoker로 호출하므로
-- authenticated가 실행할 수 있어야 한다. 순수 계산 함수라 public 스키마에 둔다.
create or replace function public.cosine_similarity(a double precision[], b double precision[])
returns double precision
language plpgsql
immutable
set search_path = ''
as $$
declare
  dot double precision := 0;
  norm_a double precision := 0;
  norm_b double precision := 0;
  len integer;
  i integer;
begin
  if a is null or b is null then
    return null;
  end if;

  len := array_length(a, 1);

  if len is null or len < 8 or len <> array_length(b, 1) then
    return null;
  end if;

  for i in 1..len loop
    dot := dot + a[i] * b[i];
    norm_a := norm_a + a[i] * a[i];
    norm_b := norm_b + b[i] * b[i];
  end loop;

  if norm_a = 0 or norm_b = 0 then
    return null;
  end if;

  return dot / (sqrt(norm_a) * sqrt(norm_b));
end;
$$;

revoke all on function public.cosine_similarity(double precision[], double precision[]) from public, anon;
grant execute on function public.cosine_similarity(double precision[], double precision[]) to authenticated;

-- 2) 확정 시 개체 임베딩 갱신 트리거 -----------------------------------------

create or replace function private.sync_cat_embedding_on_resolve()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('new_cat', 'linked')
    and new.resolved_cat_id is not null
    and new.embedding is not null
    and new.embedding_version is not null
  then
    update public.cats
    set
      embedding = new.embedding,
      embedding_version = new.embedding_version
    where id = new.resolved_cat_id;
  end if;

  return new;
end;
$$;

drop trigger if exists cat_observations_sync_embedding on public.cat_observations;
create trigger cat_observations_sync_embedding
  after update of status on public.cat_observations
  for each row
  when (old.status = 'pending')
  execute function private.sync_cat_embedding_on_resolve();

-- 3) 후보 RPC: 점수 통합 정렬 + 유사도 반영 ----------------------------------

drop function if exists public.generate_cat_match_candidates(uuid, text[], text[], integer);

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
      case
        when current_observation.embedding is not null
          and cats.embedding is not null
          and current_observation.embedding_version = cats.embedding_version
        then public.cosine_similarity(current_observation.embedding, cats.embedding)
        else null
      end as visual_similarity,
      exists (
        select 1
        from public.user_cat_collections collections
        where collections.user_id = current_user_id
          and collections.cat_id = region_candidates.cat_id
      ) as collected_by_user
    from region_candidates
    join public.cats cats on cats.id = region_candidates.cat_id
  ),
  scored_candidates as (
    select
      candidate_evidence.*,
      least(
        0.99,
        0.30
          + case when candidate_evidence.collected_by_user then 0.15 else 0 end
          + case when candidate_evidence.exact_region_name then 0.10 else 0.05 end
          + case when candidate_evidence.coat_match then 0.08 else 0 end
          + case
              when candidate_evidence.last_seen_at >= current_date - 30 then 0.15
              when candidate_evidence.last_seen_at >= current_date - 180 then 0.10
              else 0.05
            end
          + least(candidate_evidence.region_encounter_count, 20) * 0.005
          + greatest(coalesce(candidate_evidence.visual_similarity, 0), 0) * 0.25
      )::double precision as score
    from candidate_evidence
  ),
  ranked_candidates as (
    select
      scored_candidates.*,
      row_number() over (
        order by
          scored_candidates.score desc,
          scored_candidates.last_seen_at desc,
          scored_candidates.number asc
      )::integer as candidate_rank
    from scored_candidates
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
      ranked_candidates.score,
      ranked_candidates.candidate_rank,
      concat_ws(
        ' · ',
        case
          when ranked_candidates.collected_by_user then '내 도감에도 있는 고양이'
          else '현재 동네의 기존 고양이'
        end,
        case when coalesce(ranked_candidates.visual_similarity, 0) >= 0.5 then '사진 특징이 비슷해요' end,
        case when ranked_candidates.coat_match then '털색이 비슷해요' end,
        '최근 ' || to_char(ranked_candidates.last_seen_at, 'YYYY.MM.DD'),
        '동네 기록 ' || ranked_candidates.region_encounter_count || '회'
      ),
      case
        when ranked_candidates.visual_similarity is not null then 'visual_embedding'
        when ranked_candidates.coat_match then 'neighborhood_recent_coat'
        else 'neighborhood_recent'
      end,
      case
        when ranked_candidates.visual_similarity is not null then current_observation.embedding_version
        else null
      end
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
