-- Verification SQL for 000017_merge_collection_profiles_select_policies.sql.
-- Run after applying the migration. The DO block raises when the policy shape is
-- not the intended single authenticated permissive SELECT policy.

select
  policyname,
  permissive,
  roles,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'collection_profiles'
order by cmd, policyname;

do $$
declare
  select_policy_count integer;
  merged_policy_count integer;
  old_policy_count integer;
begin
  select count(*) into select_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'collection_profiles'
    and cmd = 'SELECT'
    and permissive = 'PERMISSIVE'
    and roles = array['authenticated']::name[];

  select count(*) into merged_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'collection_profiles'
    and policyname = 'collection_profiles_select_own_or_public'
    and cmd = 'SELECT'
    and permissive = 'PERMISSIVE'
    and roles = array['authenticated']::name[]
    and qual like '%auth.uid%'
    and qual like '%user_id%'
    and qual like '%is_public%';

  select count(*) into old_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'collection_profiles'
    and policyname in (
      'collection_profiles_select_own',
      'collection_profiles_select_public'
    );

  if select_policy_count <> 1 then
    raise exception 'expected exactly one authenticated permissive SELECT policy on collection_profiles, got %', select_policy_count;
  end if;

  if merged_policy_count <> 1 then
    raise exception 'merged collection_profiles SELECT policy is missing or does not include owner/public branches';
  end if;

  if old_policy_count <> 0 then
    raise exception 'old collection_profiles SELECT policies still exist';
  end if;
end;
$$;

-- Optional authenticated smoke test.
--
-- This section is intentionally read-only and rolls back. It prints candidate
-- viewer/private/public rows from existing data, then verifies the three
-- important behaviours when enough rows exist:
-- - my private or public profile remains visible to me;
-- - another user's public profile remains visible;
-- - another user's private profile remains hidden.
--
-- If the project has no private or public "other user" fixture yet, the related
-- row returns "skipped" rather than failing.

begin;
select set_config(
  'verify.collection_profiles_viewer_id',
  coalesce((
    select user_id::text
    from public.collection_profiles
    order by updated_at desc, user_id
    limit 1
  ), ''),
  true
) as viewer_user_id;

select set_config(
  'verify.collection_profiles_public_other_id',
  coalesce((
    select cp.user_id::text
    from public.collection_profiles cp
    where cp.user_id <> nullif(current_setting('verify.collection_profiles_viewer_id', true), '')::uuid
      and cp.is_public
    order by cp.updated_at desc, cp.user_id
    limit 1
  ), ''),
  true
) as public_other_user_id;

select set_config(
  'verify.collection_profiles_private_other_id',
  coalesce((
    select cp.user_id::text
    from public.collection_profiles cp
    where cp.user_id <> nullif(current_setting('verify.collection_profiles_viewer_id', true), '')::uuid
      and not cp.is_public
    order by cp.updated_at desc, cp.user_id
    limit 1
  ), ''),
  true
) as private_other_user_id;

select set_config(
  'request.jwt.claim.sub',
  current_setting('verify.collection_profiles_viewer_id', true),
  true
) as authenticated_viewer_user_id;

set local role authenticated;

with viewer as (
  select nullif(current_setting('verify.collection_profiles_viewer_id', true), '')::uuid as user_id
),
candidate_ids as (
  select
    nullif(current_setting('verify.collection_profiles_public_other_id', true), '')::uuid as public_other_id,
    nullif(current_setting('verify.collection_profiles_private_other_id', true), '')::uuid as private_other_id
)
select
  'own profile visible' as check_name,
  case
    when (select user_id from viewer) is null then 'skipped: no viewer profile'
    when exists (
      select 1
      from public.collection_profiles cp, viewer v
      where cp.user_id = v.user_id
    ) then 'pass'
    else 'fail'
  end as result
union all
select
  'public other profile visible',
  case
    when (select public_other_id from candidate_ids) is null then 'skipped: no public other profile'
    when exists (
      select 1
      from public.collection_profiles cp
      where cp.user_id = (select public_other_id from candidate_ids)
    ) then 'pass'
    else 'fail'
  end
union all
select
  'private other profile hidden',
  case
    when (select private_other_id from candidate_ids) is null then 'skipped: no private other profile'
    when not exists (
      select 1
      from public.collection_profiles cp
      where cp.user_id = (select private_other_id from candidate_ids)
    ) then 'pass'
    else 'fail'
  end;

rollback;
