# 소셜 도감 방문 전환 문서

## 목표

사용자가 꾸민 `고양이 도감`을 앱 안에서 다른 사용자가 방문할 수 있게 한다. `냥꾸러미`의 꾸미기 가치는 내 화면에서 끝나지 않고, 다른 사용자에게 보여주고 반응을 받는 흐름으로 확장한다.

## 비목표

- 정확한 좌표나 상세 발견 위치를 공개하지 않는다.
- 외부 웹 공개 URL은 이번 단계에서 만들지 않는다.
- 실시간 채팅, 댓글, DM은 이번 단계에서 만들지 않는다.
- 다른 사용자의 비공개 발견 기록이나 개인 이메일을 노출하지 않는다.

## 제품 구조

1. 내 고양이 도감
   - 내가 꾸민 표지, 대표 고양이, 배지, 도장, 수집 현황을 보여준다.
   - `꾸미기` 버튼으로 `고양이 서랍`에 진입한다.

2. 공개 도감 방문
   - 다른 사용자의 도감 표지를 앱 안에서 본다.
   - 대표 고양이, 표지 문구, 수집 수, 배지/도장 수를 본다.
   - 좋아요와 팔로우를 누를 수 있다.

3. 동네 랭킹
   - 지역 단위로 공개 도감을 탐색한다.
   - 랭킹 기준은 수집 수, 좋아요 수, 최근 활동을 조합한다.
   - 정확한 좌표는 사용하지 않고 `regions.name` 또는 발견 기록의 지역명 단위만 사용한다.

## Supabase 모델

기존 테이블 확장:

- `collection_profiles.is_public`: 내 꾸민 도감을 공개할지 여부

신규 테이블:

- `collection_likes`: 사용자가 다른 공개 도감에 누른 좋아요
- `collection_follows`: 사용자가 다른 사용자의 공개 도감을 팔로우한 관계

RPC:

- `get_public_collection_detail(owner_id)`: 공개 도감 상세 조회
- `list_public_collection_rankings()`: 공개 도감 랭킹 목록 조회
- `toggle_collection_like(owner_id)`: 좋아요 토글
- `toggle_collection_follow(owner_id)`: 팔로우 토글

## RLS 기준

- 공개 도감 조회는 `collection_profiles.is_public = true`인 사용자만 가능하다.
- 좋아요/팔로우는 로그인 사용자만 가능하다.
- 자기 자신의 도감에는 좋아요/팔로우할 수 없다.
- 좋아요/팔로우 row는 본인 row만 insert/delete 가능하다.
- 공개 조회 RPC는 이메일, provider, 정확 좌표, 비공개 발견 기록을 반환하지 않는다.

## 클라이언트 작업 범위

- `src/shared/types/social.ts` 추가
- `src/shared/api/social.api.ts` 추가
- `src/features/social/PublicCollectionScreen.tsx` 추가
- `src/features/social/NeighborhoodRankingScreen.tsx` 추가
- 내 도감 표지와 MY에서 다른 공개 도감/랭킹 진입점을 제공
- 공개 도감 화면에서는 `좋아요`, `팔로우`, `돌아가기` 액션을 제공

## 단계별 구현

### 0단계: 전환 문서 작성

상태: `[done]`

- 이 문서를 추가한다.
- 공개 범위와 비공개 범위를 명확히 한다.

### 1단계: Supabase 모델과 RPC

상태: `[done]`

- 공개 여부 컬럼, 좋아요/팔로우 테이블, RLS, RPC를 추가한다.
- 공개 도감 상세와 랭킹이 민감 정보를 반환하지 않는지 확인한다.

### 2단계: 클라이언트 API와 타입

상태: `[done]`

- 공개 도감 상세, 랭킹, 좋아요/팔로우 토글 API를 추가한다.
- Supabase RPC 응답을 앱 타입으로 매핑한다.

### 3단계: 공개 도감 방문 화면

상태: `[done]`

- 다른 사용자의 도감 표지, 대표 고양이, 배지/도장 수를 보여준다.
- 좋아요와 팔로우 버튼을 연결한다.

### 4단계: 동네 랭킹 화면

상태: `[done]`

- 공개 도감 목록을 랭킹 형태로 보여준다.
- 항목을 누르면 공개 도감 방문 화면으로 이동한다.

### 5단계: 앱 내 진입점 연결

상태: `[done]`

- 내 도감 표지에서 동네 랭킹 진입점을 제공한다.
- MY에서 팔로우/좋아요 기능으로 이어지는 탐색 진입점을 제공한다.

### 6단계: 검증

상태: `[done]`

- `npm run typecheck`를 통과한다.
- 공개 도감 조회가 비공개 도감 또는 민감 정보를 노출하지 않는지 확인한다.
- 무료/`냥꾸러미` 사용자의 공개 도감 표현 차이가 유지되는지 확인한다.
- 시뮬레이터에서 홈, 도감, 고양이 서랍, 공개 도감, 랭킹, MY 흐름을 확인한다.

검증 결과:

- `npm run typecheck` 통과.
- Supabase 원격 프로젝트에 `nyangkkureomi_subscription`, `revenuecat_payment_sync`, `social_catdex_visit` 마이그레이션 적용 완료.
- 원격 DB에서 `collection_profiles`, `collection_likes`, `collection_follows`, `collection_themes`, `featured_cats`, `user_entitlements` 테이블 존재 확인.
- 원격 DB에서 `get_public_collection_detail`, `list_public_collection_rankings`, `toggle_collection_like`, `toggle_collection_follow` RPC 존재 확인.
- Android 시뮬레이터 실행은 Android SDK/adb 미설치로 실패.
- iOS 시뮬레이터 실행은 개발 빌드가 설치되어 있지 않아 실패.
- Expo Metro는 `CI=1 npx expo start --offline --port 8085`로 기동 확인 후 종료.
