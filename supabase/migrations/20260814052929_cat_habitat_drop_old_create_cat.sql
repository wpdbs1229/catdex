-- create_cat에 p_habitat을 더하면서 인자 수가 바뀌어, 옛 10인자 함수가
-- 그대로 남아 오버로드가 됐다. 기본값이 있는 인자라 10개로 호출하면 두
-- 후보가 모두 맞아 ambiguous가 된다. 옛 것을 지운다.
drop function if exists public.create_cat(
  text, text[], text, text, text, text[], text, double precision, double precision, text
);

-- 새로 만든 함수는 기본 권한(PUBLIC 실행 가능)을 달고 태어난다.
-- 옛 함수가 갖고 있던 범위(postgres/authenticated/service_role)로 되돌린다.
revoke all on function public.create_cat(
  text, text[], text, text, text, text[], text, double precision, double precision, text, text
) from public, anon;
