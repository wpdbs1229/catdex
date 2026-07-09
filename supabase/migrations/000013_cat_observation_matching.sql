create table if not exists public.cat_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_image_url text not null,
  cutout_image_url text not null,
  region_name text not null,
  detection_confidence double precision not null default 0,
  detection_box jsonb,
  feature_vector double precision[] not null default '{}',
  is_precise_cutout boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'linked', 'new_cat', 'uncertain')),
  resolved_cat_id uuid references public.cats(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cat_match_candidates (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.cat_observations(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  score double precision not null default 0,
  rank integer not null default 0,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (observation_id, cat_id)
);

create index if not exists idx_cat_observations_user_created_at
  on public.cat_observations(user_id, created_at desc);

create index if not exists idx_cat_observations_region_created_at
  on public.cat_observations(region_name, created_at desc);

create index if not exists idx_cat_match_candidates_observation_rank
  on public.cat_match_candidates(observation_id, rank asc);

drop trigger if exists cat_observations_set_updated_at on public.cat_observations;
create trigger cat_observations_set_updated_at
  before update on public.cat_observations
  for each row execute function public.set_updated_at();

alter table public.cat_observations enable row level security;
alter table public.cat_match_candidates enable row level security;

create policy "cat_observations_select_own"
  on public.cat_observations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "cat_observations_insert_own"
  on public.cat_observations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cat_observations_update_own"
  on public.cat_observations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cat_match_candidates_select_own_observation"
  on public.cat_match_candidates for select
  to authenticated
  using (
    exists (
      select 1
      from public.cat_observations observations
      where observations.id = cat_match_candidates.observation_id
        and observations.user_id = (select auth.uid())
    )
  );

create policy "cat_match_candidates_insert_own_observation"
  on public.cat_match_candidates for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.cat_observations observations
      where observations.id = cat_match_candidates.observation_id
        and observations.user_id = (select auth.uid())
    )
  );

create policy "cat_match_candidates_update_own_observation"
  on public.cat_match_candidates for update
  to authenticated
  using (
    exists (
      select 1
      from public.cat_observations observations
      where observations.id = cat_match_candidates.observation_id
        and observations.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.cat_observations observations
      where observations.id = cat_match_candidates.observation_id
        and observations.user_id = (select auth.uid())
    )
  );

grant select, insert, update on public.cat_observations to authenticated;
grant select, insert, update on public.cat_match_candidates to authenticated;
