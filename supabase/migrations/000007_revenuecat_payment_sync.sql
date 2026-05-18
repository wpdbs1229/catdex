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
      and (
        status in ('active', 'trialing')
        or (status = 'canceled' and current_period_ends_at is not null and current_period_ends_at > now())
      )
      and (current_period_ends_at is null or current_period_ends_at > now())
  );
$$;
