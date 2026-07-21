-- private 스키마의 authenticated USAGE 권한이 회수되어, security invoker
-- RPC(create_cat, record_cat_encounter)가 private.ensure_region 등
-- private 헬퍼를 호출할 때 "permission denied for schema private"로
-- 실패했다. 000001의 원래 설계대로 USAGE를 복구한다.
-- (private 함수별 EXECUTE 권한은 회수되지 않아 별도 복구가 필요 없다.)
grant usage on schema private to authenticated;
