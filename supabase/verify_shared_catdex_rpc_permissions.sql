-- Verification SQL for 000016_tighten_public_collection_rpc_permissions.sql.
-- Run after applying the migration. The final DO block raises on failure.

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute,
  has_function_privilege('public', p.oid, 'execute') as public_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_public_collection_detail',
    'list_public_collection_rankings',
    'toggle_collection_like',
    'toggle_collection_follow'
  )
order by p.proname;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute,
  has_function_privilege('public', p.oid, 'execute') as public_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname in (
    'public_collection_summary',
    'list_public_collection_rankings'
  )
order by p.proname, arguments;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'get_public_collection_detail',
        'list_public_collection_rankings',
        'toggle_collection_like',
        'toggle_collection_follow'
      )
      and (
        p.prosecdef
        or has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('public', p.oid, 'execute')
        or not has_function_privilege('authenticated', p.oid, 'execute')
      )
  ) then
    raise exception 'public shared catdex RPC permissions are not in the intended state';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'get_public_collection_detail',
        'list_public_collection_rankings',
        'toggle_collection_like',
        'toggle_collection_follow'
      )
      and p.prosecdef
      and (
        has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute')
      )
  ) then
    raise exception 'advisor-targeted SECURITY DEFINER public RPC remains executable';
  end if;
end;
$$;

-- Optional authenticated smoke test. Replace the UUIDs if needed.
-- begin;
-- set local role authenticated;
-- select set_config(
--   'request.jwt.claim.sub',
--   (
--     select user_id::text
--     from public.collection_profiles
--     order by updated_at desc
--     limit 1
--   ),
--   true
-- );
-- select public.list_public_collection_rankings();
-- select public.get_public_collection_detail(
--   (
--     select user_id
--     from public.collection_profiles
--     where is_public
--     order by updated_at desc
--     limit 1
--   )
-- );
-- rollback;

-- Advisor follow-up:
-- Re-run Supabase security advisors and confirm these lint names no longer
-- appear for the four public RPCs:
-- - anon_security_definer_function_executable
-- - authenticated_security_definer_function_executable
