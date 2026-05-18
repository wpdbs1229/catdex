create table if not exists public.cat_sightings (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  region_name text not null,
  coat_type text not null check (coat_type in ('치즈냥', '삼색이', '턱시도', '검은냥', '흰냥')),
  behavior_hint text not null default '',
  image_url text,
  status text not null default 'open' check (status in ('open', 'linked', 'dismissed')),
  matched_cat_id uuid references public.cats(id) on delete set null,
  sighted_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cat_sightings_status_created_at
  on public.cat_sightings(status, created_at desc);

create index if not exists idx_cat_sightings_reporter_created_at
  on public.cat_sightings(reporter_id, created_at desc);

drop trigger if exists cat_sightings_set_updated_at on public.cat_sightings;
create trigger cat_sightings_set_updated_at
  before update on public.cat_sightings
  for each row execute function public.set_updated_at();

create or replace function public.create_cat_sighting(
  p_region_name text,
  p_coat_type text,
  p_behavior_hint text default '',
  p_image_url text default null
)
returns public.cat_sightings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_sighting public.cat_sightings;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_region_name is null or length(trim(p_region_name)) = 0 then
    raise exception 'Region name is required' using errcode = '22023';
  end if;

  insert into public.cat_sightings (
    reporter_id,
    region_name,
    coat_type,
    behavior_hint,
    image_url
  )
  values (
    current_user_id,
    trim(p_region_name),
    p_coat_type,
    trim(coalesce(p_behavior_hint, '')),
    p_image_url
  )
  returning * into next_sighting;

  return next_sighting;
end;
$$;

alter table public.cat_sightings enable row level security;

create policy "cat_sightings_select_open_or_own"
  on public.cat_sightings for select
  to authenticated
  using (status = 'open' or (select auth.uid()) = reporter_id);

create policy "cat_sightings_insert_own"
  on public.cat_sightings for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

create policy "cat_sightings_update_own_open"
  on public.cat_sightings for update
  to authenticated
  using ((select auth.uid()) = reporter_id and status = 'open')
  with check ((select auth.uid()) = reporter_id);

grant select, insert, update on public.cat_sightings to authenticated;
grant execute on function public.create_cat_sighting(text, text, text, text) to authenticated;
