alter table public.collection_profiles
  add column if not exists selected_stamp_ids text[] not null default '{}';

create or replace function private.validate_collection_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  theme_is_premium boolean;
  selected_badge_count integer;
  selected_stamp_count integer;
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

  selected_badge_count := coalesce(array_length(new.selected_badge_ids, 1), 0);

  if selected_badge_count > 0 and exists (
    select 1
    from unnest(new.selected_badge_ids) as selected_badge_id
    where not exists (
      select 1
      from public.user_badges
      where user_id = new.user_id
        and badge_id = selected_badge_id
    )
  ) then
    raise exception '획득한 골목 배지만 도감에 진열할 수 있습니다.' using errcode = '42501';
  end if;

  if selected_badge_count > 2 and not private.user_has_nyangkkureomi(new.user_id) then
    raise exception '골목 배지 추가 진열은 냥꾸러미 구독이 필요합니다.' using errcode = '42501';
  end if;

  if selected_badge_count > 4 then
    raise exception '골목 배지는 최대 4개까지 진열할 수 있습니다.' using errcode = '22023';
  end if;

  selected_stamp_count := coalesce(array_length(new.selected_stamp_ids, 1), 0);

  if selected_stamp_count > 0 and exists (
    select 1
    from unnest(new.selected_stamp_ids) as selected_stamp_id
    where not exists (
      select 1
      from public.user_season_stamps
      where user_id = new.user_id
        and stamp_id = selected_stamp_id
    )
  ) then
    raise exception '획득한 냥발 도장만 도감에 진열할 수 있습니다.' using errcode = '42501';
  end if;

  if selected_stamp_count > 0 and exists (
    select 1
    from unnest(new.selected_stamp_ids) as selected_stamp_id
    join public.season_stamps on season_stamps.id = selected_stamp_id
    where season_stamps.is_premium
  ) and not private.user_has_nyangkkureomi(new.user_id) then
    raise exception '프리미엄 냥발 도장 진열은 냥꾸러미 구독이 필요합니다.' using errcode = '42501';
  end if;

  if selected_stamp_count > 1 and not private.user_has_nyangkkureomi(new.user_id) then
    raise exception '냥발 도장 추가 진열은 냥꾸러미 구독이 필요합니다.' using errcode = '42501';
  end if;

  if selected_stamp_count > 3 then
    raise exception '냥발 도장은 최대 3개까지 진열할 수 있습니다.' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop policy if exists "user_season_stamps_insert_own" on public.user_season_stamps;

revoke insert on public.user_season_stamps from authenticated;
