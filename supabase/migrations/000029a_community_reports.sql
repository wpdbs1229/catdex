-- 마이그레이션에 없던 community_reports를 코드로 옮긴다.
--
-- 이 테이블은 운영 DB에만 손으로 만들어져 있었다. 000030의 주석이 그 사실을 적고
-- 있지만("운영 DB에 이미 존재하므로"), 정의가 어디에도 없어서 빈 DB에 마이그레이션을
-- 처음부터 적용하면 000030이 "relation does not exist"로 멈춘다.
--
-- 아래 정의는 운영 DB(wqiqdybzhbmsvccpklli)의 실제 스키마를 그대로 옮긴 것이다.
-- target_type은 000030이 'USER'까지 넓히므로 여기서는 그 이전 상태인 POST/COMMENT로 둔다.
-- 이미 테이블이 있는 운영 DB에서는 if not exists로 전부 그냥 지나간다.

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  detail text,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'community_reports_target_type_check'
      and conrelid = 'public.community_reports'::regclass
  ) then
    alter table public.community_reports
      add constraint community_reports_target_type_check
      check (target_type in ('POST', 'COMMENT'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'community_reports_reason_check'
      and conrelid = 'public.community_reports'::regclass
  ) then
    alter table public.community_reports
      add constraint community_reports_reason_check
      check (reason in (
        'SPAM', 'ABUSE', 'INAPPROPRIATE_IMAGE', 'PRIVACY',
        'ANIMAL_ABUSE', 'LOCATION_EXPOSURE', 'ETC'
      ));
  end if;
end
$$;

create index if not exists idx_community_reports_reporter_created_at
  on public.community_reports (reporter_id, created_at desc);

alter table public.community_reports enable row level security;

-- 신고는 본인이 넣은 것만 보고 넣을 수 있다. 수정·삭제는 없다.
drop policy if exists "community_reports_select_own" on public.community_reports;
create policy "community_reports_select_own"
  on public.community_reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

drop policy if exists "community_reports_insert_own" on public.community_reports;
create policy "community_reports_insert_own"
  on public.community_reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

grant select, insert on public.community_reports to authenticated;
