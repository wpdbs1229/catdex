-- V2 RPC의 anon 실행 권한 회수.
--
-- Supabase 기본 권한(ALTER DEFAULT PRIVILEGES)이 함수 생성 시 anon에게도
-- execute를 부여한다. revoke from public만으로는 그 직접 부여가 남는다.
-- 함수 내부에서 auth.uid() null을 거르긴 하지만, docs/13 기준대로
-- 노출 자체를 줄인다. (기존 상점·투표 RPC들도 같은 상태지만 이 문서 범위 밖 -
-- 별도 정리 대상으로 보고만 한다.)

revoke execute on function public.ensure_support_room_setup() from anon;
revoke execute on function public.save_support_room_layout(text, integer, text, text, jsonb) from anon;
revoke execute on function public.purchase_support_room_item(text, text) from anon;
revoke execute on function public.grant_support_room_points(text, text, integer) from anon;
revoke execute on function public.migrate_support_room_v1(text[], jsonb) from anon;
revoke execute on function public.record_support_room_visit(text, uuid, text, text, timestamptz, integer, jsonb) from anon;
