-- Restore the entitlement table needed by the RevenueCat webhook without
-- reintroducing removed customization, badge, or public collection surfaces.

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'shared_map_lifetime')),
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

drop function if exists private.user_has_nyangkkureomi(uuid);

alter table public.user_entitlements enable row level security;

drop policy if exists "user_entitlements_select_own" on public.user_entitlements;
create policy "user_entitlements_select_own"
  on public.user_entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.user_entitlements to authenticated;
