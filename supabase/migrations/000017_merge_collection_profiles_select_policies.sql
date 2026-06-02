-- Merge duplicated permissive SELECT policies on collection_profiles.
--
-- Supabase advisor can flag multiple permissive policies for the same
-- table/role/action because Postgres evaluates permissive RLS policies with OR.
-- The previous effective SELECT condition for authenticated users was:
--
--   ((select auth.uid()) = user_id) OR is_public
--
-- Keep that exact access model in one policy so:
-- - owners can still read their own collection profile, even when private;
-- - authenticated users can still read public collection profiles;
-- - authenticated users still cannot read another user's private profile.
--
-- Risk points:
-- - Do not remove the owner branch. Private "내 도감" would disappear from the
--   owner because UPDATE also depends on a SELECT-visible row.
-- - Do not remove the public branch. 공개 도감, ranking/detail RPC lookups, and
--   collection like/follow policy checks depend on public profiles being visible.
-- - This migration only changes SELECT policies. Existing INSERT/UPDATE grants,
--   RLS policies, triggers, and the is_public default are intentionally unchanged.

drop policy if exists "collection_profiles_select_own_or_public" on public.collection_profiles;
drop policy if exists "collection_profiles_select_own" on public.collection_profiles;
drop policy if exists "collection_profiles_select_public" on public.collection_profiles;

create policy "collection_profiles_select_own_or_public"
  on public.collection_profiles for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or is_public
  );
