# Supabase 000015 충돌 정리 및 적용 준비

## 대상 프로젝트

- Supabase 프로젝트: `catdex`
- Project ref: `wqiqdybzhbmsvccpklli`

## 적용 전후 차이

### 적용 전

- 로컬 마이그레이션에 `000015` 번호가 두 번 사용됨.
  - `supabase/migrations/000015_add_remaining_fk_indexes.sql`
  - `supabase/migrations/000015_tighten_public_collection_rpc_permissions.sql`
- Supabase CLI는 같은 번호의 마이그레이션을 순서대로 안전하게 적용할 수 없으므로 적용 전에 번호 충돌을 해소해야 함.

### 적용 후

- FK 인덱스 보강 마이그레이션은 기존 번호 유지.
  - `supabase/migrations/000015_add_remaining_fk_indexes.sql`
- 공유 도감 RPC 권한 강화 마이그레이션은 다음 번호로 renumber.
  - `supabase/migrations/000016_tighten_public_collection_rpc_permissions.sql`
- 검증 SQL 헤더도 `000016_tighten_public_collection_rpc_permissions.sql` 기준으로 갱신.
  - `supabase/verify_shared_catdex_rpc_permissions.sql`

## 실행 순서

1. Supabase CLI 인증 상태를 준비한다.

```sh
npx supabase login
```

또는 CI/비대화 환경에서는 `SUPABASE_ACCESS_TOKEN`을 설정한다.

2. 원격/로컬 마이그레이션 상태를 확인한다.

```sh
npx supabase migration list --linked
```

기대 상태:

- 원격은 아직 `000015_add_remaining_fk_indexes.sql`, `000016_tighten_public_collection_rpc_permissions.sql`이 적용되지 않았거나,
- 이미 `000015_add_remaining_fk_indexes.sql`만 적용된 상태여야 한다.
- 원격에 기존 `000015_tighten_public_collection_rpc_permissions.sql` 이름으로 적용된 이력이 있으면, 적용 전에 migration history repair 여부를 별도 판단한다.

3. 적용 전 로컬 번호 충돌을 다시 확인한다.

```sh
find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print \
  | sed 's#.*/##; s/_.*//' \
  | sort \
  | uniq -d
```

기대 결과: 출력 없음.

4. 연결된 `catdex` 프로젝트에 마이그레이션을 적용한다.

```sh
npx supabase db push
```

5. 적용 후 원격 마이그레이션 상태를 다시 확인한다.

```sh
npx supabase migration list --linked
```

기대 상태:

- `000015_add_remaining_fk_indexes.sql` 적용됨.
- `000016_tighten_public_collection_rpc_permissions.sql` 적용됨.

## 권한 검증 SQL

RPC 권한 강화 검증은 아래 파일을 SQL Editor 또는 psql에서 실행한다.

```sh
supabase/verify_shared_catdex_rpc_permissions.sql
```

핵심 기대값:

- `public.get_public_collection_detail(uuid)`
- `public.list_public_collection_rankings()`
- `public.toggle_collection_like(uuid)`
- `public.toggle_collection_follow(uuid)`

위 public RPC는 모두 다음 상태여야 한다.

- `security_definer = false`
- `anon_can_execute = false`
- `public_can_execute = false`
- `authenticated_can_execute = true`

private helper는 public/anon/authenticated에 broad execute 권한이 남아 있지 않아야 한다. 검증 파일 마지막 `DO` 블록은 의도한 상태가 아니면 예외를 발생시킨다.

## FK 인덱스 검증 SQL

`000015_add_remaining_fk_indexes.sql` 적용 후 파일 하단의 검증 SQL을 실행한다.

기대 결과:

- 지정된 FK 모든 행의 `has_covering_index = true`
- missing-only recheck 쿼리는 `0 rows`

## 현재 환경 메모

- 현재 로컬에는 전역 `supabase` CLI가 없어서 `npx supabase` 기준으로 실행한다.
- 이 환경에서는 `npx supabase migration list --linked`가 `SUPABASE_ACCESS_TOKEN` 또는 `supabase login` 부재로 원격 조회까지 완료되지 않았다.
- `supabase/.temp/project-ref`는 `catdex` ref인 `wqiqdybzhbmsvccpklli`로 보강되어 CLI가 repo 루트 기준 연결 ref를 읽을 수 있다.
