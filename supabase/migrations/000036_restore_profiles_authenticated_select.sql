-- profiles 테이블에서 authenticated 역할의 SELECT 권한이 회수되어
-- 로그인 직후 프로필 upsert(ON CONFLICT는 기존 행 조회 필요)가
-- "permission denied for table profiles"로 실패했다. SELECT를 복구한다.
-- 행 단위 접근 제어는 기존 RLS 정책이 계속 담당한다.
grant select on public.profiles to authenticated;
