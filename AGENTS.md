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
- 기능 작업은 기능마다 별도 브랜치를 만들어 진행합니다.
- 커밋은 가능한 가장 작은 논리 단위로 나눕니다.
- 기능 단위 작업이 끝나면 PR을 생성합니다.
- 커밋/PR을 만들 수 없는 환경이면 즉시 사용자에게 알리고, 코드 변경 범위를 더 키우기 전에 저장소 상태를 먼저 정리합니다.
- 공유 도감 전환은 `docs/shared-catdex-migration.md`를 기준 문서로 삼습니다.
- 기능을 검증하고 오류가 생기면 수정합니다. 오류가 없다면, 브랜치를 분리하고 한글로 커밋 푸쉬 PR 절차를 진행합니다.

## 개발/검증 워크플로

- 클라이언트 작업은 기본적으로 `catdex-client` 디렉터리에서 진행합니다.
- 패키지 매니저는 현재 `npm` 기준입니다. 새 스크립트나 의존성 문서화도 `npm` 기준으로 맞춥니다.
- Node.js 버전은 `>=20.19.4 <21 || >=22` 제약을 따릅니다.
- 구현 중 기본 검증은 `cd catdex-client && npm run typecheck`로 수행합니다.
- 화면/수동 QA가 필요한 단계는 `docs/shared-catdex-migration.md` 기준으로 `홈`, `도감`, `촬영`, `지도`, `MY` 화면을 확인합니다.
- 로컬 실행이 필요하면 `cd catdex-client && npm run start`를 기본으로 사용합니다.
- 디바이스 연결 방식에 따라 `cd catdex-client && npm run start:lan`, `cd catdex-client && npm run start:tunnel`을 사용합니다.
- 에뮬레이터 실행은 `cd catdex-client && npm run android`, `cd catdex-client && npm run ios`를 사용합니다.
- OAuth/딥링크 검증 시 `catdex-client/.env.example`에 맞춰 `EXPO_PUBLIC_OAUTH_REDIRECT_URI`를 설정합니다. 현재 예시는 Expo Go Android 에뮬레이터 `exp://127.0.0.1:8081`, 개발 빌드 `catdex://`입니다.
- Supabase 환경변수는 `catdex-client/.env.example` 기준으로 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 설정합니다.
- TODO: 저장소에서 합의된 Supabase 로컬 CLI 실행/마이그레이션 적용 명령은 아직 확인하지 못했습니다. 확인되면 이 문서에 추가합니다.

## Supabase 전환 단계

각 단계는 구현 후 검증하고, 오류가 있으면 수정 후 재검증합니다. 단계 상태는 작업하면서 갱신합니다.
