create table if not exists public.user_cat_collections (
  user_id uuid not null references auth.users(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  first_collected_at date not null default current_date,
  last_seen_at date not null default current_date,
  encounter_count integer not null default 1 check (encounter_count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, cat_id)
);

create table if not exists public.cat_regions (
  region_id text not null references public.regions(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  first_seen_at date not null default current_date,
  last_seen_at date not null default current_date,
  encounter_count integer not null default 1 check (encounter_count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (region_id, cat_id)
);

create table if not exists public.cat_photos (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  encounter_id uuid references public.cat_encounters(id) on delete set null,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  is_representative boolean not null default false,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  cat_id uuid references public.cats(id) on delete cascade,
  encounter_id uuid references public.cat_encounters(id) on delete cascade,
  photo_id uuid references public.cat_photos(id) on delete cascade,
  reason text not null check (reason in ('duplicate_cat', 'inappropriate_photo', 'location_risk', 'incorrect_info', 'other')),
  memo text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.cats
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.cats
  add column if not exists representative_photo_url text;

alter table public.cat_encounters
  add column if not exists is_public boolean not null default true;

update public.cats
set
  created_by = coalesce(created_by, user_id),
  representative_photo_url = coalesce(representative_photo_url, image_url)
where created_by is null
   or (representative_photo_url is null and image_url is not null);

insert into public.user_cat_collections (user_id, cat_id, first_collected_at, last_seen_at, encounter_count)
select user_id, id, first_seen_at, last_seen_at, encounter_count
from public.cats
on conflict (user_id, cat_id) do update set
  first_collected_at = least(public.user_cat_collections.first_collected_at, excluded.first_collected_at),
  last_seen_at = greatest(public.user_cat_collections.last_seen_at, excluded.last_seen_at),
  encounter_count = greatest(public.user_cat_collections.encounter_count, excluded.encounter_count),
  updated_at = now();

insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
select
  region_id,
  cat_id,
  current_date,
  current_date,
  count(*)::integer
from public.region_cats
group by region_id, cat_id
on conflict (region_id, cat_id) do update set
  last_seen_at = greatest(public.cat_regions.last_seen_at, excluded.last_seen_at),
  encounter_count = greatest(public.cat_regions.encounter_count, excluded.encounter_count),
  updated_at = now();

insert into public.cat_photos (cat_id, uploaded_by, image_url, is_representative, visibility)
select id, coalesce(created_by, user_id), image_url, true, 'public'
from public.cats
where image_url is not null
on conflict do nothing;

create index if not exists idx_cats_last_seen_at on public.cats(last_seen_at desc, number asc);
create index if not exists idx_cats_created_by on public.cats(created_by);
create index if not exists idx_cat_encounters_cat_seen_at on public.cat_encounters(cat_id, seen_at asc);
create index if not exists idx_user_cat_collections_user_last_seen on public.user_cat_collections(user_id, last_seen_at desc);
create index if not exists idx_cat_regions_region_last_seen on public.cat_regions(region_id, last_seen_at desc);
create index if not exists idx_cat_photos_cat_created_at on public.cat_photos(cat_id, created_at desc);
create index if not exists idx_reports_status_created_at on public.reports(status, created_at asc);

drop trigger if exists user_cat_collections_set_updated_at on public.user_cat_collections;
create trigger user_cat_collections_set_updated_at
  before update on public.user_cat_collections
  for each row execute function public.set_updated_at();

drop trigger if exists cat_regions_set_updated_at on public.cat_regions;
create trigger cat_regions_set_updated_at
  before update on public.cat_regions
  for each row execute function public.set_updated_at();

create or replace function public.create_cat(
  p_name text,
  p_type text,
  p_tags text[],
  p_region_name text,
  p_memo text,
  p_image_url text default null
)
returns public.cats
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_number integer;
  next_cat public.cats;
  next_encounter public.cat_encounters;
  next_region_id text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Cat name is required' using errcode = '22023';
  end if;

  if p_region_name is null or length(trim(p_region_name)) = 0 then
    raise exception 'Region name is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('shared_cat_number'));

  select coalesce(max(number), 0) + 1
  into next_number
  from public.cats;

  insert into public.cats (
    user_id,
    created_by,
    number,
    name,
    type,
    rarity,
    encounter_count,
    first_seen_at,
    last_seen_at,
    relationship_level,
    tags,
    memo,
    image_url,
    representative_photo_url
  )
  values (
    current_user_id,
    current_user_id,
    next_number,
    trim(p_name),
    p_type,
    3,
    1,
    current_date,
    current_date,
    public.cat_relationship_level(1),
    coalesce(p_tags, '{}'),
    nullif(trim(coalesce(p_memo, '')), ''),
    p_image_url,
    p_image_url
  )
  returning * into next_cat;

  insert into public.cat_encounters (user_id, cat_id, seen_at, region_name, memo, image_url, location_precision, is_public)
  values (current_user_id, next_cat.id, current_date, p_region_name, coalesce(p_memo, ''), p_image_url, 'region', true)
  returning * into next_encounter;

  insert into public.user_cat_collections (user_id, cat_id, first_collected_at, last_seen_at, encounter_count)
  values (current_user_id, next_cat.id, current_date, current_date, 1)
  on conflict (user_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.user_cat_collections.encounter_count + 1,
    updated_at = now();

  next_region_id := private.ensure_region(p_region_name);

  insert into public.region_cats (region_id, cat_id, user_id)
  values (next_region_id, next_cat.id, current_user_id)
  on conflict do nothing;

  insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
  values (next_region_id, next_cat.id, current_date, current_date, 1)
  on conflict (region_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.cat_regions.encounter_count + 1,
    updated_at = now();

  if p_image_url is not null then
    insert into public.cat_photos (cat_id, encounter_id, uploaded_by, image_url, is_representative, visibility)
    values (next_cat.id, next_encounter.id, current_user_id, p_image_url, true, 'public');
  end if;

  insert into public.user_badges (user_id, badge_id)
  select current_user_id, 'first-cat'
  where exists (select 1 from public.badges where id = 'first-cat')
  on conflict do nothing;

  return next_cat;
end;
$$;

create or replace function private.record_cat_encounter_shared(
  p_cat_id uuid,
  p_region_name text,
  p_memo text,
  p_image_url text default null
)
returns public.cat_encounters
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_count integer;
  next_encounter public.cat_encounters;
  next_region_id text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_region_name is null or length(trim(p_region_name)) = 0 then
    raise exception 'Region name is required' using errcode = '22023';
  end if;

  update public.cats
  set
    encounter_count = encounter_count + 1,
    last_seen_at = current_date,
    relationship_level = public.cat_relationship_level(encounter_count + 1),
    representative_photo_url = coalesce(representative_photo_url, p_image_url),
    image_url = coalesce(image_url, p_image_url)
  where id = p_cat_id
  returning encounter_count into next_count;

  if next_count is null then
    raise exception 'Cat not found' using errcode = 'P0002';
  end if;

  insert into public.cat_encounters (user_id, cat_id, seen_at, region_name, memo, image_url, location_precision, is_public)
  values (current_user_id, p_cat_id, current_date, p_region_name, coalesce(p_memo, ''), p_image_url, 'region', true)
  returning * into next_encounter;

  insert into public.user_cat_collections (user_id, cat_id, first_collected_at, last_seen_at, encounter_count)
  values (current_user_id, p_cat_id, current_date, current_date, 1)
  on conflict (user_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.user_cat_collections.encounter_count + 1,
    updated_at = now();

  next_region_id := private.ensure_region(p_region_name);

  insert into public.region_cats (region_id, cat_id, user_id)
  values (next_region_id, p_cat_id, current_user_id)
  on conflict do nothing;

  insert into public.cat_regions (region_id, cat_id, first_seen_at, last_seen_at, encounter_count)
  values (next_region_id, p_cat_id, current_date, current_date, 1)
  on conflict (region_id, cat_id) do update set
    last_seen_at = excluded.last_seen_at,
    encounter_count = public.cat_regions.encounter_count + 1,
    updated_at = now();

  if p_image_url is not null then
    insert into public.cat_photos (cat_id, encounter_id, uploaded_by, image_url, is_representative, visibility)
    values (p_cat_id, next_encounter.id, current_user_id, p_image_url, false, 'public');
  end if;

  return next_encounter;
end;
$$;

create or replace function public.record_cat_encounter(
  p_cat_id uuid,
  p_region_name text,
  p_memo text,
  p_image_url text default null
)
returns public.cat_encounters
language sql
security invoker
set search_path = ''
as $$
  select * from private.record_cat_encounter_shared(p_cat_id, p_region_name, p_memo, p_image_url);
$$;

alter table public.user_cat_collections enable row level security;
alter table public.cat_regions enable row level security;
alter table public.cat_photos enable row level security;
alter table public.reports enable row level security;

drop policy if exists "cats_select_own" on public.cats;
drop policy if exists "cat_encounters_select_own" on public.cat_encounters;
drop policy if exists "cat_images_select_own" on storage.objects;

create policy "cats_select_authenticated"
  on public.cats for select
  to authenticated
  using (true);

create policy "cat_encounters_select_public_or_own"
  on public.cat_encounters for select
  to authenticated
  using (is_public or (select auth.uid()) = user_id);

create policy "user_cat_collections_select_own"
  on public.user_cat_collections for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_cat_collections_insert_own"
  on public.user_cat_collections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_cat_collections_update_own"
  on public.user_cat_collections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cat_regions_select_authenticated"
  on public.cat_regions for select
  to authenticated
  using (true);

create policy "cat_regions_insert_authenticated"
  on public.cat_regions for insert
  to authenticated
  with check (true);

create policy "cat_photos_select_public_or_own"
  on public.cat_photos for select
  to authenticated
  using (visibility = 'public' or (select auth.uid()) = uploaded_by);

create policy "cat_photos_insert_own"
  on public.cat_photos for insert
  to authenticated
  with check ((select auth.uid()) = uploaded_by);

create policy "cat_photos_update_own"
  on public.cat_photos for update
  to authenticated
  using ((select auth.uid()) = uploaded_by)
  with check ((select auth.uid()) = uploaded_by);

create policy "cat_photos_delete_own"
  on public.cat_photos for delete
  to authenticated
  using ((select auth.uid()) = uploaded_by);

create policy "reports_select_own"
  on public.reports for select
  to authenticated
  using ((select auth.uid()) = reporter_id);

create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

create policy "cat_images_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'cat-images');

grant select, insert, update on public.user_cat_collections to authenticated;
grant select, insert on public.cat_regions to authenticated;
grant select, insert, update, delete on public.cat_photos to authenticated;
grant select, insert on public.reports to authenticated;
grant execute on function private.record_cat_encounter_shared(uuid, text, text, text) to authenticated;
