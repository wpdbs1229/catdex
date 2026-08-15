-- 공지사항
--
-- 앱 마이페이지에서 읽고, docs/admin에서 쓴다. 공지는 급할 때 올리는 것이라
-- 글 하나 올리자고 앱이나 문서 사이트를 배포하게 두면 결국 안 올리게 된다.
-- 그래서 데이터로 둔다.
--
-- 대기자 명단 관리자 기능은 이메일(개인정보)을 다뤄서 Edge Function이
-- service_role로 대신 읽었지만, 공지는 공개 글이라 그럴 필요가 없다.
-- 관리자가 자기 토큰으로 직접 쓰고 RLS가 막는다.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  body text not null check (length(btrim(body)) > 0),
  -- null이면 초안. 미래 시각이면 그때 열린다.
  published_at timestamptz,
  -- 중요한 공지를 목록 맨 위에 붙인다.
  pinned boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.announcements.published_at is
  'null이면 초안, 미래면 예약 발행. 이 시각이 지나야 앱에 보인다.';

create index if not exists idx_announcements_published
  on public.announcements (pinned desc, published_at desc)
  where published_at is not null;

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- 관리자 여부. 이미 있는 private.admin_users를 그대로 본다.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.admin_users au
    where au.user_id = (select auth.uid())
      and au.revoked_at is null
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

alter table public.announcements enable row level security;

drop policy if exists announcements_public_read on public.announcements;
drop policy if exists announcements_admin_all on public.announcements;

-- 열린 공지는 로그인 여부와 무관하게 누구나 읽는다.
create policy announcements_public_read on public.announcements
  for select
  using (published_at is not null and published_at <= now());

-- 관리자는 초안·예약까지 보고 쓸 수 있다.
create policy announcements_admin_all on public.announcements
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

grant select on table public.announcements to anon, authenticated;
grant insert, update, delete on table public.announcements to authenticated;
