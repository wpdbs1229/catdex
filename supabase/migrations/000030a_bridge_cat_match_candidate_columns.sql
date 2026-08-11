-- 마이그레이션 순서 구멍 메우기
--
-- 000031은 cat_match_candidates.match_method를 전제로 제약과 함수를 다시 만든다.
-- 그런데 그 컬럼을 넣는 건 20260712083111이고, 파일명 사전순으로 000031보다 뒤다.
-- ('0' < '2') 실제 운영 DB는 적용된 시점 순서 덕에 멀쩡하지만, 빈 DB에 처음부터
-- 적용하면 000031이 "column match_method does not exist"로 멈춘다.
--
-- 이미 적용된 마이그레이션의 파일명을 바꾸면 CLI가 미적용으로 보고 다시 돌리려 하므로
-- 손대지 않는다. 대신 000030과 000031 사이에 정렬되는 이 파일에서 컬럼만 미리 보장한다.
-- 20260712083111이 나중에 같은 컬럼을 add if not exists로 다시 시도하면 무해하게 넘어간다.

alter table public.cat_match_candidates
  add column if not exists match_method text not null default 'neighborhood_recent',
  add column if not exists model_version text;
