-- Verification SQL for supabase/seed.nyangkkureomi-ab.sql.
-- Run after applying all migrations and then the seed.
--
-- Expected setup:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.nyangkkureomi-ab.sql
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/verify_nyangkkureomi_ab.sql

do $$
declare
  free_user_id constant uuid := '30000000-0000-0000-0000-0000000000f1';
  paid_user_id constant uuid := '40000000-0000-0000-0000-0000000000b2';
  shared_region_count integer;
  paid_featured_count integer;
  free_featured_count integer;
  stale_like_count integer;
  stale_follow_count integer;
begin
  if private.user_has_nyangkkureomi(free_user_id) then
    raise exception 'free QA user unexpectedly has nyangkkureomi access';
  end if;

  if not private.user_has_nyangkkureomi(paid_user_id) then
    raise exception 'paid QA user does not have nyangkkureomi access';
  end if;

  select count(*) into shared_region_count
  from public.cat_regions
  where region_id in ('nyang-ab-gil', 'nyang-ab-park');

  if shared_region_count <> 4 then
    raise exception 'shared map region data mismatch: expected 4 cat_regions rows, got %', shared_region_count;
  end if;

  select count(*) into free_featured_count
  from public.featured_cats
  where user_id = free_user_id;

  if free_featured_count <> 1 then
    raise exception 'free QA user featured cat count mismatch: expected 1, got %', free_featured_count;
  end if;

  select count(*) into paid_featured_count
  from public.featured_cats
  where user_id = paid_user_id;

  if paid_featured_count <> 3 then
    raise exception 'paid QA user featured cat count mismatch: expected 3, got %', paid_featured_count;
  end if;

  select count(*) into stale_like_count
  from public.collection_likes
  where owner_id in (free_user_id, paid_user_id)
     or liked_by in (free_user_id, paid_user_id);

  if stale_like_count <> 0 then
    raise exception 'A/B seed should reset likes for deterministic ranking, got % rows', stale_like_count;
  end if;

  select count(*) into stale_follow_count
  from public.collection_follows
  where followed_id in (free_user_id, paid_user_id)
     or follower_id in (free_user_id, paid_user_id);

  if stale_follow_count <> 0 then
    raise exception 'A/B seed should reset follows for deterministic social state, got % rows', stale_follow_count;
  end if;
end;
$$;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-0000000000b2', true);

with rankings as (
  select public.list_public_collection_rankings() as data
)
select
  1 / case when exists (
    select 1
    from rankings, jsonb_array_elements(rankings.data) item
    where item->>'ownerId' = '40000000-0000-0000-0000-0000000000b2'
      and (item->>'hasNyangkkureomi')::boolean
      and item->'stats'->>'collectedCount' = '3'
  ) then 1 else 0 end as paid_user_visible_in_rankings;

with detail as (
  select public.get_public_collection_detail('30000000-0000-0000-0000-0000000000f1') as data
)
select
  1 / case when data->>'ownerId' = '30000000-0000-0000-0000-0000000000f1'
    and data->'viewer'->>'isOwner' = 'false'
  then 1 else 0 end as paid_user_can_open_public_collection
from detail;

rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-0000000000f1', true);

with entitlement as (
  select tier, status
  from public.user_entitlements
  where user_id = '30000000-0000-0000-0000-0000000000f1'
)
select
  1 / case when exists (
    select 1 from entitlement where tier = 'free' and status = 'active'
  ) then 1 else 0 end as free_user_entitlement_is_free;

-- The social RPCs intentionally remain authenticated-user APIs.
-- The subscription gate for shared map/ranking entry is enforced in App.tsx.
-- This query proves the free test user can authenticate, while manual app QA
-- should prove the free user is routed to NyangkkureomiUpsellScreen instead.

rollback;
