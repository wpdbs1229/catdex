-- 마이그레이션에 빠져 있던 스키마를 한 번에 메운다.
--
-- 두 가지를 합쳤다. 둘 다 000013(cat_match_candidates)과 000001(profiles) 뒤,
-- 000030·000031 앞이어야 해서 비어 있던 000014 자리에 둔다.
-- 앞서 000029a·000030a로 나눠 뒀더니 Supabase CLI가 "file name must match
-- pattern <timestamp>_name.sql"이라며 건너뛰었다. 숫자만 쓰는 6자리로 되돌린다.
--
-- 운영 DB에는 둘 다 이미 있으므로 전부 무해하게 지나간다.

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

-- ── 아래는 000031이 전제하는 컬럼 보장 ──────────────────────────────
-- 000031은 cat_match_candidates.match_method를 쓰는데, 그 컬럼을 넣는
-- 20260712083111이 파일명 사전순으로 000031보다 뒤라서 빈 DB에서는 순서가 뒤집힌다.
-- 이미 적용된 파일명을 바꾸면 CLI가 미적용으로 보므로 여기서 컬럼만 미리 보장한다.

alter table public.cat_match_candidates
  add column if not exists match_method text not null default 'neighborhood_recent',
  add column if not exists model_version text;
