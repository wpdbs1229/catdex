alter table public.user_entitlements
  drop constraint if exists user_entitlements_tier_check;

alter table public.user_entitlements
  add constraint user_entitlements_tier_check
  check (tier in ('free', 'shared_map_lifetime'));

alter table public.user_entitlements
  drop constraint if exists user_entitlements_source_check;

alter table public.user_entitlements
  add constraint user_entitlements_source_check
  check (source in ('manual', 'revenuecat', 'app_store', 'play_store'));

create or replace function private.user_has_shared_map_lifetime(p_user_id uuid)
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
      and tier = 'shared_map_lifetime'
      and (
        status in ('active', 'trialing')
        or (status = 'canceled' and current_period_ends_at is not null and current_period_ends_at > now())
      )
      and (current_period_ends_at is null or current_period_ends_at > now())
  );
$$;

create or replace function public.get_shared_map_regions()
returns table (
  id text,
  name text,
  lat double precision,
  lng double precision,
  radius integer,
  cats text[],
  cat_previews jsonb
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.user_entitlements
    where user_id = current_user_id
      and tier = 'shared_map_lifetime'
      and (
        status in ('active', 'trialing')
        or (status = 'canceled' and current_period_ends_at is not null and current_period_ends_at > now())
      )
      and (current_period_ends_at is null or current_period_ends_at > now())
  ) then
    raise exception 'Shared map lifetime access required' using errcode = '42501';
  end if;

  return query
  with shared_cats as (
    select distinct on (r.id, c.id)
      r.id,
      r.name,
      round(r.lat::numeric, 3)::double precision as lat,
      round(r.lng::numeric, 3)::double precision as lng,
      greatest(r.radius, 500)::integer as radius,
      c.id::text as cat_id,
      c.name as cat_name,
      coalesce(c.representative_photo_url, c.image_url) as image_url,
      cr.last_seen_at
    from public.cat_regions cr
    join public.regions r on r.id = cr.region_id
    join public.cats c on c.id = cr.cat_id
    where c.user_id <> current_user_id
    order by r.id, c.id, cr.last_seen_at desc nulls last, c.name
  )
  select
    shared_cats.id,
    shared_cats.name,
    shared_cats.lat,
    shared_cats.lng,
    max(shared_cats.radius)::integer as radius,
    array_agg(shared_cats.cat_name order by shared_cats.cat_name) as cats,
    jsonb_agg(
      jsonb_build_object(
        'id', shared_cats.cat_id,
        'name', shared_cats.cat_name,
        'imageUrl', shared_cats.image_url
      )
      order by shared_cats.last_seen_at desc nulls last, shared_cats.cat_name
    ) as cat_previews
  from shared_cats
  group by shared_cats.id, shared_cats.name, shared_cats.lat, shared_cats.lng
  order by shared_cats.name;
end;
$$;

revoke all on function public.get_shared_map_regions() from public;
grant execute on function public.get_shared_map_regions() to authenticated;
