alter table public.collection_profiles
  add column if not exists selected_stamp_ids text[] not null default '{}';

create or replace function private.validate_collection_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_badge_count integer;
  selected_stamp_count integer;
begin
  if not exists (
    select 1
    from public.collection_themes
    where id = new.cover_theme_id
  ) then
    raise exception 'Collection theme not found' using errcode = 'P0002';
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

  if selected_stamp_count > 3 then
    raise exception '냥발 도장은 최대 3개까지 진열할 수 있습니다.' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop policy if exists "user_season_stamps_insert_own" on public.user_season_stamps;

revoke insert on public.user_season_stamps from authenticated;
