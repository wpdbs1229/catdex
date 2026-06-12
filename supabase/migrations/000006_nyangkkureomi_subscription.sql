create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'nyangkkureomi')),
  status text not null default 'active' check (status in ('active', 'trialing', 'canceled', 'expired')),
  source text not null default 'manual' check (source in ('manual', 'revenuecat', 'app_store', 'play_store')),
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_themes (
  id text primary key,
  name text not null,
  description text not null,
  palette text not null default 'warm',
  is_premium boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cover_theme_id text not null references public.collection_themes(id),
  display_title text not null default '나의 냥도감',
  intro text not null default '오늘도 골목에서 만난 친구들을 기록해요.',
  selected_badge_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.featured_cats (
  user_id uuid not null references auth.users(id) on delete cascade,
  cat_id uuid not null references public.cats(id) on delete cascade,
  slot integer not null check (slot between 1 and 3),
  caption text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot),
  unique (user_id, cat_id)
);

create table if not exists public.season_stamps (
  id text primary key,
  name text not null,
  description text not null,
  season_key text not null,
  starts_on date not null,
  ends_on date not null,
  is_premium boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (starts_on <= ends_on)
);

create table if not exists public.user_season_stamps (
  user_id uuid not null references auth.users(id) on delete cascade,
  stamp_id text not null references public.season_stamps(id) on delete cascade,
  achieved_at date not null default current_date,
  primary key (user_id, stamp_id)
);

create index if not exists idx_collection_themes_sort_order on public.collection_themes(sort_order, id);
create index if not exists idx_featured_cats_user_slot on public.featured_cats(user_id, slot);
create index if not exists idx_season_stamps_season_sort on public.season_stamps(season_key, sort_order);
create index if not exists idx_user_season_stamps_user_achieved on public.user_season_stamps(user_id, achieved_at desc);

drop trigger if exists user_entitlements_set_updated_at on public.user_entitlements;
create trigger user_entitlements_set_updated_at
  before update on public.user_entitlements
  for each row execute function public.set_updated_at();

drop trigger if exists collection_profiles_set_updated_at on public.collection_profiles;
create trigger collection_profiles_set_updated_at
  before update on public.collection_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists featured_cats_set_updated_at on public.featured_cats;
create trigger featured_cats_set_updated_at
  before update on public.featured_cats
  for each row execute function public.set_updated_at();

create or replace function private.user_has_nyangkkureomi(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_entitlements
    where user_id = p_user_id
      and tier = 'nyangkkureomi'
      and status in ('active', 'trialing')
      and (current_period_ends_at is null or current_period_ends_at > now())
  );
$$;

create or replace function private.validate_collection_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  theme_is_premium boolean;
begin
  select is_premium into theme_is_premium
  from public.collection_themes
  where id = new.cover_theme_id;

  if theme_is_premium is null then
    raise exception 'Collection theme not found' using errcode = 'P0002';
  end if;

  if theme_is_premium and not private.user_has_nyangkkureomi(new.user_id) then
    raise exception '냥꾸러미 구독이 필요한 표지입니다.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function private.validate_featured_cat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.slot > 1 and not private.user_has_nyangkkureomi(new.user_id) then
    raise exception '대표 고양이 추가 슬롯은 냥꾸러미 구독이 필요합니다.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_cat_collections
    where user_id = new.user_id
      and cat_id = new.cat_id
  ) then
    raise exception '내 도감에 수집한 고양이만 대표로 설정할 수 있습니다.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists collection_profiles_validate on public.collection_profiles;
create trigger collection_profiles_validate
  before insert or update on public.collection_profiles
  for each row execute function private.validate_collection_profile();

drop trigger if exists featured_cats_validate on public.featured_cats;
create trigger featured_cats_validate
  before insert or update on public.featured_cats
  for each row execute function private.validate_featured_cat();

insert into public.collection_themes (id, name, description, palette, is_premium, sort_order) values
  ('field-note', '골목 관찰 노트', '처음 쓰는 냥도감에 어울리는 따뜻한 기본 표지', 'warm', false, 10),
  ('sunny-window', '햇살 창가', '햇빛 아래 낮잠 자는 고양이를 닮은 기본 표지', 'green', false, 20),
  ('night-alley', '밤 골목 산책', '조용한 밤 산책 감성을 담은 냥꾸러미 표지', 'night', true, 110),
  ('sticker-drawer', '스티커 서랍', '스탬프와 배지를 가득 붙인 냥꾸러미 표지', 'playful', true, 120),
  ('winter-blanket', '겨울 담요', '겨울에 만난 고양이를 포근하게 보여주는 냥꾸러미 표지', 'winter', true, 130)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  palette = excluded.palette,
  is_premium = excluded.is_premium,
  sort_order = excluded.sort_order;

insert into public.badges (id, name, description) values
  ('regular-cat', '단골 냥이', '같은 고양이를 여러 번 기록했어요.'),
  ('cheese-collector', '치즈냥 수집가', '치즈냥 친구들을 꾸준히 만났어요.'),
  ('winter-recorder', '겨울 기록자', '추운 계절의 만남도 놓치지 않았어요.')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.season_stamps (id, name, description, season_key, starts_on, ends_on, is_premium, sort_order) values
  ('spring-walk-2026', '봄 산책 냥발 도장', '봄 골목에서 만난 친구들을 기억해요.', '2026-spring', date '2026-03-01', date '2026-05-31', false, 10),
  ('rainy-day-2026', '비 오는 날 냥발 도장', '비 오는 골목에서 만난 순간을 남겨요.', '2026-rainy', date '2026-06-01', date '2026-07-15', false, 20),
  ('autumn-alley-2026', '가을 골목 냥발 도장', '선선한 골목에서 마주친 순간을 모아요.', '2026-autumn', date '2026-09-01', date '2026-11-30', true, 30),
  ('winter-blanket-2026', '겨울 담요 냥발 도장', '겨울 냥도감에 포근한 도장을 붙여요.', '2026-winter', date '2026-12-01', date '2027-02-28', true, 40)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  season_key = excluded.season_key,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_premium = excluded.is_premium,
  sort_order = excluded.sort_order;

alter table public.user_entitlements enable row level security;
alter table public.collection_themes enable row level security;
alter table public.collection_profiles enable row level security;
alter table public.featured_cats enable row level security;
alter table public.season_stamps enable row level security;
alter table public.user_season_stamps enable row level security;

create policy "user_entitlements_select_own"
  on public.user_entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "collection_themes_select_authenticated"
  on public.collection_themes for select
  to authenticated
  using (true);

create policy "collection_profiles_select_own"
  on public.collection_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "collection_profiles_insert_own"
  on public.collection_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "collection_profiles_update_own"
  on public.collection_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "featured_cats_select_own"
  on public.featured_cats for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "featured_cats_insert_own"
  on public.featured_cats for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "featured_cats_update_own"
  on public.featured_cats for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "featured_cats_delete_own"
  on public.featured_cats for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "season_stamps_select_authenticated"
  on public.season_stamps for select
  to authenticated
  using (true);

create policy "user_season_stamps_select_own"
  on public.user_season_stamps for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_season_stamps_insert_own"
  on public.user_season_stamps for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select on public.user_entitlements to authenticated;
grant select on public.collection_themes to authenticated;
grant select, insert, update on public.collection_profiles to authenticated;
grant select, insert, update, delete on public.featured_cats to authenticated;
grant select on public.season_stamps to authenticated;
grant select, insert on public.user_season_stamps to authenticated;
