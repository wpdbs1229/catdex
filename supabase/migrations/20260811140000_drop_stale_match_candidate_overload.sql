-- generate_cat_match_candidates의 옛 3인자 오버로드를 정리한다.
--
-- 000031이 3인자를 drop하고 4인자(coat_hints 추가)로 다시 만든다. 그런데
-- 20260712083111이 파일명 사전순으로 000031보다 뒤에 있어서, 빈 DB에 처음부터
-- 적용하면 000031이 지운 3인자를 20260712083111이 되살린다.
--
-- 운영 DB는 적용 시점 순서(20260712 → 000031)라서 4인자만 남아 있다.
-- from-scratch 결과를 운영과 같게 맞추려면 마지막에 한 번 더 지워야 한다.
-- 운영에서는 이미 없으므로 그냥 지나간다.

drop function if exists public.generate_cat_match_candidates(uuid, text[], integer);
