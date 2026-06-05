-- Remove collection customization, subscription, public collection social,
-- and badge/stamp surfaces from the active schema.
--
-- This is a destructive forward migration. Existing migration history is kept,
-- but the removed product areas are no longer part of the runtime model.

do $$
begin
  if to_regclass('public.collection_profiles') is not null then
    execute 'drop trigger if exists collection_profiles_validate on public.collection_profiles';
    execute 'drop trigger if exists collection_profiles_set_updated_at on public.collection_profiles';
  end if;

  if to_regclass('public.featured_cats') is not null then
    execute 'drop trigger if exists featured_cats_validate on public.featured_cats';
    execute 'drop trigger if exists featured_cats_set_updated_at on public.featured_cats';
  end if;

  if to_regclass('public.user_entitlements') is not null then
    execute 'drop trigger if exists user_entitlements_set_updated_at on public.user_entitlements';
  end if;

  if to_regclass('public.user_badges') is not null then
    execute 'drop trigger if exists user_badges_enqueue_notification on public.user_badges';
  end if;

  if to_regclass('public.collection_likes') is not null then
    execute 'drop trigger if exists collection_likes_enqueue_notification on public.collection_likes';
  end if;

  if to_regclass('public.collection_follows') is not null then
    execute 'drop trigger if exists collection_follows_enqueue_notification on public.collection_follows';
  end if;
end;
$$;

drop function if exists public.get_public_collection_detail(uuid);
drop function if exists public.list_public_collection_rankings();
drop function if exists public.toggle_collection_like(uuid);
drop function if exists public.toggle_collection_follow(uuid);
drop function if exists private.public_collection_summary(uuid);
drop function if exists private.public_collection_summary(uuid, uuid);
drop function if exists private.list_public_collection_rankings();
drop function if exists private.user_has_nyangkkureomi(uuid);
drop function if exists private.validate_collection_profile();
drop function if exists private.validate_featured_cat();
drop function if exists private.notify_user_badge();
drop function if exists private.notify_collection_like();
drop function if exists private.notify_collection_follow();

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

  return next_cat;
end;
$$;

grant execute on function public.create_cat(text, text, text[], text, text, text) to authenticated;

delete from public.notification_events
where type in ('achievement', 'collection_like', 'collection_follow');

alter table public.notification_events
  drop constraint if exists notification_events_type_check;

alter table public.notification_events
  add constraint notification_events_type_check
  check (type in ('shared_cat'));

alter table public.notification_settings
  drop column if exists achievement_enabled,
  drop column if exists social_enabled;

drop table if exists
  public.user_season_stamps,
  public.season_stamps,
  public.featured_cats,
  public.collection_likes,
  public.collection_follows,
  public.collection_profiles,
  public.collection_themes,
  public.user_entitlements,
  public.user_badges,
  public.badges
cascade;
