-- profiles 조회 권한을 공개 식별 컬럼으로만 제한
--
-- 운영 DB에서 authenticated의 테이블 SELECT가 통째로 빠져 있어(드리프트)
-- 소셜 로그인 시 프로필 조회가 "permission denied for table profiles"로
-- 실패했다. 그런데 profiles에는 이미 모든 행을 읽을 수 있는 RLS 정책
-- (profiles_select_public_identity, qual=true)이 있어, 테이블 SELECT를
-- 그대로 복구하면 모든 사용자의 email까지 노출된다.
--
-- 앱은 본인 email을 인증 세션(auth.users)에서 읽고, profiles 조회는
-- id/nickname/profile_image_url만 사용한다. 따라서 컬럼 단위로 공개
-- 식별 정보만 허용한다.

revoke select on public.profiles from authenticated;

grant select (id, nickname, profile_image_url) on public.profiles to authenticated;
