create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'nyangkkureomi', 'shared_map_lifetime')),
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

alter table public.user_entitlements enable row level security;

drop policy if exists "user_entitlements_select_own" on public.user_entitlements;
create policy "user_entitlements_select_own"
  on public.user_entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.user_entitlements from anon;
grant select on public.user_entitlements to authenticated;

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
        or (
          status = 'canceled'
          and current_period_ends_at is not null
          and current_period_ends_at > now()
        )
      )
      and (current_period_ends_at is null or current_period_ends_at > now())
  );
$$;

create or replace function private.validate_featured_cat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.slot > 1 and not private.user_has_nyangkkureomi(new.user_id) then
    raise exception '대표 고양이 추가 슬롯은 냥꾸러미 구독이 필요합니다.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_cat_collections
    where user_id = new.user_id
      and cat_id = new.cat_id
  ) then
    raise exception '내 도감에 수집한 고양이만 대표로 설정할 수 있습니다.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.user_has_nyangkkureomi(uuid) from public, anon, authenticated;
revoke all on function private.validate_featured_cat() from public, anon, authenticated;

drop trigger if exists featured_cats_validate on public.featured_cats;
create trigger featured_cats_validate
  before insert or update on public.featured_cats
  for each row execute function private.validate_featured_cat();
