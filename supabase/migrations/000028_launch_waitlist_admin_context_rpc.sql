create or replace function public.get_launch_waitlist_admin_context(
  p_actor_user_id uuid,
  p_metadata jsonb default '{}'::jsonb,
  p_ip_address text default null,
  p_user_agent text default null
)
returns table(admin_role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select au.role
    into v_role
  from private.admin_users as au
  where au.user_id = p_actor_user_id
    and au.revoked_at is null
  limit 1;

  if v_role is null then
    return;
  end if;

  insert into private.admin_audit_logs (
    actor_user_id,
    action,
    target,
    metadata,
    ip_address,
    user_agent
  ) values (
    p_actor_user_id,
    'launch_waitlist.list',
    'launch_waitlist',
    coalesce(p_metadata, '{}'::jsonb),
    p_ip_address,
    p_user_agent
  );

  admin_role := v_role;
  return next;
end;
$$;

revoke all on function public.get_launch_waitlist_admin_context(uuid, jsonb, text, text) from public;
revoke all on function public.get_launch_waitlist_admin_context(uuid, jsonb, text, text) from anon;
revoke all on function public.get_launch_waitlist_admin_context(uuid, jsonb, text, text) from authenticated;
grant execute on function public.get_launch_waitlist_admin_context(uuid, jsonb, text, text) to service_role;
