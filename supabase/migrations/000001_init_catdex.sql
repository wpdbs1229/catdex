create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '냥도감 탐험가',
  email text,
  provider text not null default 'kakao' check (provider in ('kakao', 'google')),
  profile_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  number integer not null,
  name text not null,
  type text not null check (type in ('치즈냥', '삼색이', '턱시도', '검은냥', '흰냥')),
  rarity integer not null default 3 check (rarity between 1 and 5),
  encounter_count integer not null default 1 check (encounter_count >= 1),
  first_seen_at date not null default current_date,
  last_seen_at date not null default current_date,
  relationship_level text not null default '첫 만남',
  tags text[] not null default '{}',
  memo text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

create table if not exists public.cat_encounters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  seen_at date not null default current_date,
  region_name text not null,
  memo text not null default '',
  image_url text,
  location_precision text not null default 'region' check (location_precision = 'region'),
  created_at timestamptz not null default now()
);

create table if not exists public.regions (
  id text primary key,
  name text not null unique,
  lat double precision not null,
  lng double precision not null,
  radius integer not null check (radius >= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.region_cats (
  region_id text not null references public.regions(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (region_id, cat_id)
);

create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  achieved_at date not null default current_date,
  primary key (user_id, badge_id)
);

create index if not exists idx_cats_user_last_seen_at on public.cats(user_id, last_seen_at desc, number asc);
create index if not exists idx_cat_encounters_user_cat_seen_at on public.cat_encounters(user_id, cat_id, seen_at asc);
create index if not exists idx_region_cats_user_region on public.region_cats(user_id, region_id);
create index if not exists idx_user_badges_user_achieved_at on public.user_badges(user_id, achieved_at asc);

create or replace function public.set_updated_at()
returns trigger
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger cats_set_updated_at
  before update on public.cats
  for each row execute function public.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname, email, provider, profile_image_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'name', '냥도감 탐험가'),
    new.email,
    case
      when new.raw_app_meta_data->>'provider' in ('kakao', 'google') then new.raw_app_meta_data->>'provider'
      else 'kakao'
    end,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update set
    nickname = excluded.nickname,
    email = excluded.email,
    provider = excluded.provider,
    profile_image_url = excluded.profile_image_url,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.cat_relationship_level(encounter_count integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when encounter_count >= 7 then '골목 대장'
    when encounter_count >= 4 then '동네 친구'
    when encounter_count >= 2 then '살짝 경계 중'
    else '첫 만남'
  end;
$$;

create or replace function public.slugify_region_name(region_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      lower(
        regexp_replace(
          regexp_replace(trim(regexp_replace(region_name, '근처$', '')), '\s+', '-', 'g'),
          '[^[:alnum:]-가-힣]',
          '',
          'g'
        )
      ),
      ''
    ),
    'region-' || substr(md5(region_name), 1, 12)
  );
$$;

create or replace function private.ensure_region(region_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_region_id text;
begin
  select id into next_region_id
  from public.regions
  where name = region_name;

  if next_region_id is null then
    next_region_id := public.slugify_region_name(region_name);

    insert into public.regions (id, name, lat, lng, radius)
    values (next_region_id, region_name, 37.5, 126.76, 350)
    on conflict (name) do update set name = excluded.name
    returning id into next_region_id;
  end if;

  return next_region_id;
end;
$$;

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

  perform pg_advisory_xact_lock(hashtext(current_user_id::text || ':cat_number'));

  select coalesce(max(number), 0) + 1
  into next_number
  from public.cats
  where user_id = current_user_id;

  insert into public.cats (
    user_id,
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
    image_url
  )
  values (
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
    p_image_url
  )
  returning * into next_cat;

  insert into public.cat_encounters (user_id, cat_id, seen_at, region_name, memo, image_url, location_precision)
  values (current_user_id, next_cat.id, current_date, p_region_name, coalesce(p_memo, ''), p_image_url, 'region');

  next_region_id := private.ensure_region(p_region_name);

  insert into public.region_cats (region_id, cat_id, user_id)
  values (next_region_id, next_cat.id, current_user_id)
  on conflict do nothing;

  insert into public.user_badges (user_id, badge_id)
  select current_user_id, 'first-cat'
  where exists (select 1 from public.badges where id = 'first-cat')
  on conflict do nothing;

  return next_cat;
end;
$$;

create or replace function public.record_cat_encounter(
  p_cat_id uuid,
  p_region_name text,
  p_memo text,
  p_image_url text default null
)
returns public.cat_encounters
language plpgsql
security invoker
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
    relationship_level = public.cat_relationship_level(encounter_count + 1)
  where id = p_cat_id
    and user_id = current_user_id
  returning encounter_count into next_count;

  if next_count is null then
    raise exception 'Cat not found' using errcode = 'P0002';
  end if;

  insert into public.cat_encounters (user_id, cat_id, seen_at, region_name, memo, image_url, location_precision)
  values (current_user_id, p_cat_id, current_date, p_region_name, coalesce(p_memo, ''), p_image_url, 'region')
  returning * into next_encounter;

  next_region_id := private.ensure_region(p_region_name);

  insert into public.region_cats (region_id, cat_id, user_id)
  values (next_region_id, p_cat_id, current_user_id)
  on conflict do nothing;

  return next_encounter;
end;
$$;

insert into public.regions (id, name, lat, lng, radius) values
  ('jung-dong', '부천시 중동 근처', 37.5035, 126.766, 350),
  ('sang-dong', '부천시 상동 근처', 37.5058, 126.753, 400),
  ('songnae-dong', '부천시 송내동 근처', 37.4873, 126.7536, 300)
on conflict (id) do update set
  name = excluded.name,
  lat = excluded.lat,
  lng = excluded.lng,
  radius = excluded.radius;

insert into public.badges (id, name, description) values
  ('first-cat', '첫 만남', '첫 고양이를 도감에 등록했어요.'),
  ('rare-finder', '희귀 발견자', '희귀도 4 이상의 고양이를 발견했어요.'),
  ('neighborhood-regular', '동네 단골', '같은 지역에서 5회 이상 발견했어요.'),
  ('hundred-dex', '도감 완성가', '100마리 도감을 완성하면 획득해요.')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cat-images', 'cat-images', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.cats enable row level security;
alter table public.cat_encounters enable row level security;
alter table public.regions enable row level security;
alter table public.region_cats enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "cats_select_own"
  on public.cats for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "cats_insert_own"
  on public.cats for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cats_update_own"
  on public.cats for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cat_encounters_select_own"
  on public.cat_encounters for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "cat_encounters_insert_own"
  on public.cat_encounters for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "regions_select_authenticated"
  on public.regions for select
  to authenticated
  using (true);

create policy "region_cats_select_own"
  on public.region_cats for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "region_cats_insert_own"
  on public.region_cats for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "badges_select_authenticated"
  on public.badges for select
  to authenticated
  using (true);

create policy "user_badges_select_own"
  on public.user_badges for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_badges_insert_own"
  on public.user_badges for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cat_images_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'cat-images'
    and owner = (select auth.uid())
  );

create policy "cat_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cat-images'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "cat_images_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'cat-images'
    and owner = (select auth.uid())
  )
  with check (
    bucket_id = 'cat-images'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "cat_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'cat-images'
    and owner = (select auth.uid())
  );

grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.cats to authenticated;
grant select, insert on public.cat_encounters to authenticated;
grant select on public.regions to authenticated;
grant select, insert on public.region_cats to authenticated;
grant select on public.badges to authenticated;
grant select, insert on public.user_badges to authenticated;
grant execute on function public.create_cat(text, text, text[], text, text, text) to authenticated;
grant execute on function public.record_cat_encounter(uuid, text, text, text) to authenticated;
grant execute on function private.ensure_region(text) to authenticated;
