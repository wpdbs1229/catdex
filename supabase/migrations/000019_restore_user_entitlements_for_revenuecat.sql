-- Restore the entitlement table needed by the RevenueCat webhook without
-- reintroducing removed customization, badge, or public collection surfaces.

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'nyangkkureomi')),
  status text not null default 'active' check (status in ('active', 'trialing', 'canceled', 'expired')),
  source text not null default 'manual' check (source in ('manual', 'revenuecat', 'app_store', 'play_store')),
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_entitlements_set_updated_at on public.user_entitlements;
create trigger user_entitlements_set_updated_at
  before update on public.user_entitlements
  for each row execute function public.set_updated_at();

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

alter table public.user_entitlements enable row level security;

drop policy if exists "user_entitlements_select_own" on public.user_entitlements;
create policy "user_entitlements_select_own"
  on public.user_entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.user_entitlements to authenticated;
