# AGENTS.md

## 프로젝트 개요

이 저장소는 Supabase 기반 앱입니다. 기존 NestJS 백엔드는 제거되었습니다.

- `catdex-client`: Expo React Native + TypeScript 모바일 mockup 앱입니다.
- `supabase`: Supabase Postgres, Auth, Storage, RLS, RPC 마이그레이션을 관리합니다.

제품 콘셉트는 "냥도감"입니다. 사용자가 길고양이를 촬영하고, 생물 도감처럼 수집하는 앱입니다.

## 작업 규칙

- 클라이언트 코드와 API 코드는 서로 다른 폴더에 둡니다.
- 하나의 큰 파일에 몰아넣지 말고, 기능/도메인 기반 폴더 구조를 우선합니다.
- 신규 백엔드 로직은 NestJS에 추가하지 않고 Supabase 마이그레이션, RLS, RPC, Storage 정책으로 구현합니다.
- 클라이언트는 백엔드 REST API 대신 `@supabase/supabase-js` 기반 접근을 사용합니다.
- Supabase `service_role` 또는 secret key는 클라이언트에 노출하지 않습니다.
- `public` 스키마에 생성하는 테이블은 RLS를 활성화하고 실제 접근 모델에 맞는 정책을 둡니다.
- 정확한 좌표는 저장하지 않고 지역 단위 정보만 저장합니다.

## 진행 방식

- 큰 기능은 별도 전환 문서를 먼저 만들고, 문서의 단계 순서대로 구현합니다.
- 단계마다 구현 후 검증하고, 오류가 발견되면 수정 후 다시 검증합니다.
- 커밋은 가능한 가장 작은 논리 단위로 나눕니다.
- 기능 단위 작업이 끝나면 PR을 생성합니다.
- 커밋/PR을 만들 수 없는 환경이면 즉시 사용자에게 알리고, 코드 변경 범위를 더 키우기 전에 저장소 상태를 먼저 정리합니다.
- 공유 도감 전환은 `docs/shared-catdex-migration.md`를 기준 문서로 삼습니다.

## Supabase 전환 단계

각 단계는 구현 후 검증하고, 오류가 있으면 수정 후 재검증합니다. 단계 상태는 작업하면서 갱신합니다.

1. `[done]` 전환 계획 문서화
   - 루트 `AGENTS.md`에 Supabase 전환 원칙, 단계, 검증 루프를 기록합니다.
   - 검증: 문서에 Supabase 기준 작업 규칙이 명시되어 있어야 합니다.

2. `[done]` Supabase 스키마 기반 추가
   - `supabase/migrations`에 기존 SQL 모델을 Supabase용 스키마로 전환합니다.
   - `profiles`, `cats`, `cat_encounters`, `regions`, `region_cats`, `badges`, `user_badges`를 설계합니다.
   - 사용자별 데이터에는 `user_id`를 두고 `auth.users(id)`를 참조합니다.
   - 생성/재발견처럼 트랜잭션이 필요한 로직은 RPC 함수로 분리합니다.
   - 검증: SQL 문법 검토, RLS 활성화 여부, `auth.uid()` 기반 정책 존재 여부를 확인합니다.

3. `[done]` Supabase Storage 전환 기반 추가
   - `cat-images` bucket과 `storage.objects` 정책을 마이그레이션에 포함합니다.
   - 클라이언트는 기존 `POST /uploads/cat-image` 대신 Supabase Storage 업로드를 사용합니다.
   - 검증: bucket 생성 SQL과 `select/insert/update/delete` 정책이 사용자 소유 경로 기준으로 제한되어야 합니다.

4. `[done]` 클라이언트 Supabase 의존성 및 환경변수 추가
   - `catdex-client`에 Supabase JS와 React Native 세션 저장소 의존성을 추가합니다.
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 환경변수를 문서화합니다.
   - 검증: `npm run typecheck`가 Supabase 클라이언트 초기화 타입 오류 없이 통과해야 합니다.

5. `[done]` 인증 레이어 전환
   - 기존 `auth.api.ts`의 REST 호출을 Supabase Auth 호출로 바꿉니다.
   - 게스트 로그인은 Supabase Anonymous Sign-in을 우선 사용합니다.
   - Kakao/Google은 Supabase OAuth redirect 흐름으로 전환합니다.
   - 검증: 앱 인증 훅 타입체크와 세션 저장/로그아웃 흐름 타입 검증을 통과해야 합니다.

6. `[done]` 데이터 API 레이어 전환
   - `cats.api.ts`, `app.api.ts`를 Supabase table query, RPC, Storage 호출로 교체합니다.
   - 기존 화면 타입(`Cat`, `CatEncounter`, `Region`, `Badge`)은 유지하고 DB row를 UI 타입으로 매핑합니다.
   - 검증: `npm run typecheck` 통과, 기존 화면 import 경로 유지.

7. `[done]` Nest 백엔드 제거
   - 클라이언트가 Supabase 전환 후 타입체크를 통과하면 기존 API 서버 코드를 제거합니다.
   - 루트 문서에서 API 서버 제거 완료 상태를 갱신합니다.
   - 검증: 루트에서 백엔드 실행/환경변수 안내가 남아 있지 않아야 합니다.
