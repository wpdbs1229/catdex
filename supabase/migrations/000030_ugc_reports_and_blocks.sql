-- Google Play UGC 정책 대응: 사용자 신고 확장과 사용자 차단
--
-- 정책 요건: 공개 UGC(동네 게시판)를 제공하는 앱은 앱 내에서
-- 1) 콘텐츠 신고 2) 사용자 신고 3) 사용자 차단 기능을 제공해야 한다.
--
-- community_reports 테이블(POST/COMMENT 신고, RLS 포함)은 운영 DB에 이미
-- 존재하므로 여기서는 USER 신고 타입 확장과 차단 테이블 추가만 수행한다.

-- 1) 사용자 신고 타입 확장 --------------------------------------------------

alter table public.community_reports
  drop constraint if exists community_reports_target_type_check;

alter table public.community_reports
  add constraint community_reports_target_type_check
  check (target_type in ('POST', 'COMMENT', 'USER'));

-- 2) 사용자 차단 -------------------------------------------------------------

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

comment on table public.user_blocks is '사용자 차단 목록 — 차단한 사용자의 게시글·댓글은 클라이언트에서 숨긴다';

create index if not exists idx_user_blocks_blocked_id
  on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
  on public.user_blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  to authenticated
  using (auth.uid() = blocker_id);

grant select, insert, delete on public.user_blocks to authenticated;
