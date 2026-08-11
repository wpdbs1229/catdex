-- slugify_region_name을 운영 DB에 실제로 배포된 정의와 맞춘다.
--
-- 000001의 정의는 어떤 PostgreSQL에서도 실행되지 않는다.
--
--   '[^[:alnum:]-가-힣]'
--   ERROR: invalid regular expression: invalid character range
--
-- 대괄호 안에서 문자 클래스 뒤의 '-'를 범위 시작으로 읽기 때문이다.
-- 로컬 PG14와 운영 PG17.6 양쪽에서 같은 에러를 확인했다.
--
-- 운영 DB는 이 함수가 손으로 고쳐진 상태이고, 그 덕에 고양이 등록이 동작해 왔다.
-- 마이그레이션만 깨진 정의를 들고 있어서 빈 DB에 적용하면 create_cat이 죽는다.
-- 아래는 운영 배포본을 그대로 옮긴 것이다. 동작을 바꾸지 않는다.
--
-- 참고: [^[:alnum:]-]인데도 한글이 남는다. [:alnum:]이 로케일을 따르고
-- 운영 DB가 en_US.UTF-8이라 한글이 alnum에 포함되기 때문이다.
-- 그래서 000001의 '가-힣'은 애초에 없어도 되는 조건이었다.
-- 운영에서 확인: slugify_region_name('부천시 중동 근처') -> '부천시-중동'
-- md5 폴백은 이름이 통째로 걸러졌을 때만 쓰인다.

create or replace function public.slugify_region_name(region_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      lower(
        regexp_replace(
          regexp_replace(trim(regexp_replace(coalesce(region_name, ''), '근처$', '')), '\s+', '-', 'g'),
          '[^[:alnum:]-]',
          '',
          'g'
        )
      ),
      ''
    ),
    'region-' || substr(md5(coalesce(region_name, '')), 1, 12)
  );
$$;
