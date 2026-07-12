alter table public.cat_match_candidates
  add column if not exists match_method text not null default 'neighborhood_recent',
  add column if not exists model_version text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cat_match_candidates_match_method_check'
      and conrelid = 'public.cat_match_candidates'::regclass
  ) then
    alter table public.cat_match_candidates
      add constraint cat_match_candidates_match_method_check
      check (match_method in ('neighborhood_recent', 'visual_embedding', 'manual'));
  end if;
end
$$;

drop policy if exists "cat_match_candidates_delete_own_observation" on public.cat_match_candidates;
create policy "cat_match_candidates_delete_own_observation"
  on public.cat_match_candidates for delete
  to authenticated
  using (
    exists (
      select 1
      from public.cat_observations observations
      where observations.id = cat_match_candidates.observation_id
        and observations.user_id = (select auth.uid())
    )
  );

create or replace function public.generate_cat_match_candidates(
  p_observation_id uuid,
  p_region_names text[] default '{}',
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
        '최근 ' || to_char(ranked_candidates.last_seen_at, 'YYYY.MM.DD'),
        '동네 기록 ' || ranked_candidates.region_encounter_count || '회'
      ),
      'neighborhood_recent',
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

grant delete on public.cat_match_candidates to authenticated;

revoke execute on function public.generate_cat_match_candidates(uuid, text[], integer) from public, anon;
grant execute on function public.generate_cat_match_candidates(uuid, text[], integer) to authenticated;
