# 냥꾸러미 구독 기능 전환 문서

## 목표

`냥꾸러미`는 냥도감의 핵심 수집 경험을 막지 않고, 사용자가 자신의 도감을 더 아기자기하게 꾸미고 공유하고 싶을 때 선택하는 구독 기능이다.

## 비목표

- 고양이 촬영, 등록, 기본 도감 조회를 구독으로 막지 않는다.
- 정확한 좌표 저장 기능을 추가하지 않는다.
- 결제 secret, store receipt 검증 secret, Supabase `service_role` key를 클라이언트에 노출하지 않는다.
- 첫 구현에서 App Store/Play Store 실결제까지 붙이지 않는다. MVP는 내부 entitlement로 기능 게이트를 검증한다.

## 명명 기준

- 구독명: `냥꾸러미`
- 꾸미기 메뉴명: `고양이 서랍`
- 배지명: `골목 배지`
- 시즌 스탬프명: `냥발 도장`
- 대표 고양이 영역: `우리 도감 주인공`

## 무료/구독 경계

무료 사용자는 기본 수집과 기본 꾸미기를 사용할 수 있다.

- 기본 도감 표지 선택
- 기본 골목 배지 확인
- 대표 고양이 1마리 설정
- 기본 프로필 문구 설정

`냥꾸러미` 사용자는 표현과 장식 폭이 넓어진다.

- 프리미엄 도감 표지 선택
- 대표 고양이 최대 3마리 설정
- 시즌 냥발 도장 진열
- 구독 전용 골목 배지와 고양이 서랍 아이템 사용

## 화면 목록

1. MY
   - `냥꾸러미` 상태 요약
   - `고양이 서랍` 진입 버튼
   - `우리 도감 주인공` 미리보기

2. 고양이 서랍
   - 도감 표지 선택
   - 우리 도감 주인공 설정
   - 골목 배지 진열
   - 냥발 도장 확인
   - 잠금 아이템 선택 시 `냥꾸러미` 안내

3. 냥꾸러미 안내
   - 월 3,900원 / 연 39,000원 기준 문구
   - 실제 상품 ID와 가격은 스토어 설정 전까지 코드에 고정하지 않는다.

## Supabase 스키마

정의 테이블:

- `collection_themes`: 도감 표지 테마
- `season_stamps`: 시즌 냥발 도장 정의

사용자 테이블:

- `user_entitlements`: 사용자 구독 권한
- `collection_profiles`: 사용자 도감 꾸미기 프로필
- `featured_cats`: 우리 도감 주인공 슬롯
- `user_season_stamps`: 사용자가 획득한 냥발 도장

기존 테이블 활용:

- `badges`, `user_badges`는 `골목 배지`로 표시한다.

## RLS 정책

- 모든 public 테이블은 RLS를 활성화한다.
- 정의 테이블은 authenticated 사용자가 select 가능하다.
- 사용자 테이블은 `auth.uid()`가 일치하는 행만 select/insert/update/delete 가능하다.
- 무료 사용자는 프리미엄 표지와 대표 고양이 2~3번 슬롯을 저장할 수 없어야 한다.
- 대표 고양이는 사용자가 수집한 고양이만 설정할 수 있어야 한다.

## 클라이언트 작업 범위

- `src/shared/types/collection.ts`에 구독/꾸미기 타입 추가
- `src/shared/api/collection.api.ts`에 Supabase 조회/저장 API 추가
- `src/features/collection/CollectionDrawerScreen.tsx`에 `고양이 서랍` 화면 추가
- MY 화면에 `냥꾸러미` 요약과 진입 버튼 추가
- 하드 paywall이 아니라 잠금 아이템을 눌렀을 때 자연스럽게 안내한다.

## 검증 항목

- `npm run typecheck` 통과
- 무료 사용자는 기본 표지와 대표 고양이 1마리만 설정 가능
- `냥꾸러미` 사용자는 프리미엄 표지와 대표 고양이 3마리 설정 가능
- 다른 사용자의 꾸미기 프로필, 대표 고양이, 냥발 도장을 수정할 수 없음
- 촬영, 등록, 도감 조회, 지도, MY 기본 플로우가 구독 기능 때문에 막히지 않음

## 출시 후 확장

- RevenueCat 또는 스토어 직접 결제 연동
- Edge Function 기반 receipt 검증
- 시즌 이벤트 자동 지급 RPC
- 공유용 도감 카드 이미지 생성
- 월간 수집 리포트와 시즌 스탬프북

## 결제 연동 기준

세금, 환불, 영수증 검증을 앱에서 직접 처리하지 않기 위해 `냥꾸러미`는 App Store / Google Play 인앱 구독 위에 RevenueCat을 붙인다.

클라이언트:

- `react-native-purchases`로 RevenueCat SDK를 사용한다.
- `appUserID`는 Supabase Auth 사용자 UUID를 그대로 사용한다.
- 클라이언트에는 RevenueCat public SDK key만 둔다.
- RevenueCat secret key, Supabase `service_role` key, webhook secret은 클라이언트에 두지 않는다.

RevenueCat 설정:

- Entitlement ID: `nyangkkureomi`
- Offering ID: `nyangkkureomi` 또는 RevenueCat current offering
- 권장 패키지: 월간, 연간
- 주간 구독은 기본 상품으로 만들지 않는다.
- iOS Bundle ID: `com.persimmontree.catdex`
- Android package: `com.persimmontree.catdex`

Supabase 동기화:

- RevenueCat webhook URL은 `supabase/functions/revenuecat-webhook` 배포 URL을 사용한다.
- webhook Authorization 헤더는 `Bearer ${REVENUECAT_WEBHOOK_SECRET}` 형식으로 설정한다.
- Edge Function은 webhook의 `app_user_id`를 `user_entitlements.user_id`로 사용한다.
- 구독 취소 후에도 만료일이 남아 있으면 `status = canceled`, `current_period_ends_at > now()` 상태로 `냥꾸러미` 접근을 유지한다.

## EAS 개발 빌드 RevenueCat 검증

`react-native-purchases`는 네이티브 RevenueCat SDK와 스토어 결제 모듈을 사용하므로 Expo Go에서 실제 결제를 검증하지 않는다. 실제 기기 검증은 `expo-dev-client`가 포함된 EAS development build로 진행한다.

앱 설정:

- `catdex-client/app.json`의 `scheme`은 `catdex`를 사용한다.
- iOS `bundleIdentifier`와 Android `package`는 모두 `com.persimmontree.catdex`로 RevenueCat, App Store Connect, Play Console 설정과 맞춘다.
- `catdex-client/eas.json`의 `development` profile은 `developmentClient: true`, `distribution: internal`을 사용한다.

환경 변수:

- 로컬 `.env`에는 `catdex-client/.env.example` 기준으로 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`를 둔다.
- OAuth를 개발 빌드에서 확인할 때는 `EXPO_PUBLIC_OAUTH_REDIRECT_URI=catdex://`를 사용한다.
- EAS 서버에서 빌드 시 필요한 공개 값은 `eas env:create --environment development --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value ...`처럼 development 환경에 등록한다.
- RevenueCat secret key, Supabase `service_role` key, webhook secret은 EAS public env나 클라이언트 `.env`에 넣지 않는다.

실행 절차:

1. `cd catdex-client`
2. `npm install`
3. Android 개발 빌드: `npm run build:dev:android`
4. iOS 개발 빌드: `npm run build:dev:ios`
5. 빌드 결과를 실제 기기에 설치한다.
6. Metro 실행: `npm run start:dev-client`
7. 개발 빌드 앱에서 Metro URL 또는 QR로 접속한다.
8. `고양이 서랍`에서 `냥꾸러미` 패키지가 보이는지, 구매/복원 버튼이 RevenueCat sandbox 또는 Play 테스트 결제로 이어지는지 확인한다.

스토어 테스트 전제:

- RevenueCat Dashboard에 Entitlement ID `nyangkkureomi`와 Offering `nyangkkureomi` 또는 current offering을 만든다.
- App Store Connect / Play Console의 월간, 연간 구독 상품을 RevenueCat product에 연결한다.
- iOS는 sandbox tester 또는 TestFlight 계정으로 확인한다.
- Android는 Play Console 내부 테스트 트랙 또는 내부 앱 공유에서 같은 package와 versionCode가 등록된 빌드로 확인한다.

현재 직접 점검 결과:

- EAS CLI 로그인 계정은 `persimmontree`로 확인됐다.
- EAS `development` 환경에는 등록된 변수가 없다.
- 로컬 `catdex-client/.env`에도 `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`가 없다.
- 따라서 현재 빌드에서는 앱이 RevenueCat SDK를 설정하지 못하고, 실제 인앱결제 패키지를 불러오지 못한다.
- 앱 코드는 RevenueCat key와 Offering/Product가 준비되면 `고양이 서랍`의 패키지 버튼에서 `Purchases.purchasePackage()`로 App Store / Google Play 결제를 시작한다.

## 냥꾸러미 A/B 검증 seed

`supabase/seed.nyangkkureomi-ab.sql`은 `고양이 서랍`, MY, 도감 표지 검증용 두 사용자를 만든다. shared-catdex step 6 seed와 같은 방식으로 로컬 Supabase DB 또는 폐기 가능한 QA 프로젝트에서 수동 실행한다. Expo 시뮬레이터에서 실제 Google/Kakao OAuth 계정으로 확인할 때는 seed 상단의 A/B UUID를 `auth.users`의 실제 OAuth 사용자 ID로 바꿔 같은 데이터 모양을 만든다.

- 무료 사용자: `nyang-free@example.test` / `password-free`
- `냥꾸러미` 사용자: `nyang-paid@example.test` / `password-paid`

seed 기대 상태:

- 무료 사용자는 `user_entitlements.tier = free`이고 기본 표지 `골목 관찰 노트`를 선택한다.
- `냥꾸러미` 사용자는 `user_entitlements.tier = nyangkkureomi`, `status = active`, `current_period_ends_at = now() + 30 days`이고 프리미엄 표지 `스티커 서랍`을 선택한다.
- 무료 사용자의 `우리 도감 주인공`은 `서랍감자` 1마리다.
- `냥꾸러미` 사용자의 `우리 도감 주인공`은 `서랍감자`, `서랍나비`, `서랍후추` 3마리다.
- 무료 사용자는 기본 골목 배지 2개와 기본 `봄 산책 냥발 도장`을 가진다.
- `냥꾸러미` 사용자는 골목 배지 4개와 기본 `봄 산책 냥발 도장`, 검증용 프리미엄 `봄 서랍 프리미엄 냥발 도장`을 가진다.
- 두 사용자는 공유 고양이 목록을 함께 보지만, MY의 대표 고양이와 구독 상태 표시는 서로 달라야 한다.

## 냥꾸러미 A/B 화면 체크리스트

고양이 서랍:

- 무료 사용자에게 기본 표지는 선택 가능하고 프리미엄 표지는 잠금 표시와 `냥꾸러미` 안내가 보여야 한다.
- 무료 사용자는 `우리 도감 주인공` 1번 슬롯만 설정 가능하고 2~3번 슬롯은 `냥꾸러미 슬롯`으로 보여야 한다.
- `냥꾸러미` 사용자는 `스티커 서랍` 표지가 선택된 상태로 보이고 프리미엄 표지 잠금이 없어야 한다.
- `냥꾸러미` 사용자는 `우리 도감 주인공` 1~3번 슬롯에 서로 다른 고양이가 선택된 상태로 보여야 한다.
- 골목 배지는 사용자별 획득 상태가 다르게 보여야 한다.
- 냥발 도장은 무료 사용자에게 프리미엄 도장이 잠금 상태로 보이고, `냥꾸러미` 사용자에게 획득 상태로 보여야 한다.
- 작은 화면에서 표지 카드, 슬롯 카드, 배지/도장 텍스트가 서로 겹치지 않아야 한다.

MY:

- 무료 사용자에게는 상단 `냥꾸러미 사용 중` pill이 없어야 한다.
- `냥꾸러미` 사용자에게는 상단 `냥꾸러미 사용 중` pill이 보여야 한다.
- 무료 사용자의 대표 고양이 미리보기는 1마리 중심으로 보이고, `냥꾸러미` 사용자는 최대 3마리까지 보여야 한다.
- `획득한 배지` 카운트는 무료 사용자 2개, `냥꾸러미` 사용자 4개 기준으로 다르게 보여야 한다.
- `고양이 서랍` 진입은 무료/구독 사용자 모두 가능해야 하며 촬영, 등록, 기본 도감 조회를 막지 않아야 한다.

도감 표지:

- 무료 사용자의 도감 표지는 `무료 서랍 냥도감`, `기본 표지와 대표 고양이 1마리로 꾸민 도감`, `골목 관찰 노트` 기준으로 보여야 한다.
- `냥꾸러미` 사용자의 도감 표지는 `냥꾸러미 서랍 도감`, `프리미엄 표지와 주인공 3마리를 진열한 도감`, `스티커 서랍` 기준으로 보여야 한다.
- 무료 사용자가 프리미엄 표지를 저장하려 하면 DB 트리거가 `냥꾸러미 구독이 필요한 표지입니다.` 오류로 막아야 한다.
- 무료 사용자가 2~3번 대표 고양이 슬롯을 저장하려 하면 DB 트리거가 `대표 고양이 추가 슬롯은 냥꾸러미 구독이 필요합니다.` 오류로 막아야 한다.
- 존재하지 않거나 내 도감에 수집하지 않은 고양이를 대표로 저장하려 하면 DB 트리거가 `내 도감에 수집한 고양이만 대표로 설정할 수 있습니다.` 오류로 막아야 한다.

## 현재 차이와 수정안

`도감 표지` 검증 기준은 `CatDexScreen` 상단의 `CollectionCoverHeader`로 연결했다. 현재 도감 화면은 `collection_profiles.display_title`, `collection_profiles.intro`, 선택한 `collection_themes`, `featured_cats`, 획득 골목 배지 수, 획득 냥발 도장 수, `냥꾸러미` 상태를 함께 렌더링한다.

구현 기준:

- `App.tsx`에서 도감 화면에 `collectionSummary`, `collectionProfile`, 선택된 `collectionTheme`를 전달한다.
- `CollectionCoverHeader`는 무료 사용자의 대표 고양이를 1마리, `냥꾸러미` 사용자의 대표 고양이를 최대 3마리까지 보여준다.
- `collectionPaletteStyle`을 shared utility로 분리해 도감 표지와 고양이 서랍 미리보기가 같은 색상 규칙을 사용한다.

현재 MY 화면에서 `고양이 서랍`으로 이동하는 동작은 있지만 메뉴 라벨이 `탐험 기록`, `내가 공유한 도감`으로 되어 있어 명명 기준과 맞지 않는다.

수정안:

- MY 메뉴에 `고양이 서랍` 항목을 명시적으로 추가하거나 기존 `탐험 기록` 항목명을 `고양이 서랍`으로 바꾼다.
- `냥꾸러미` 상태 요약과 같은 영역에서 `고양이 서랍` 진입 버튼을 한 번 더 노출해 무료/구독 사용자 모두 같은 진입점을 쓰게 한다.

현재 `user_season_stamps_insert_own` 정책은 authenticated 사용자가 자신의 임의 `stamp_id`를 직접 insert할 수 있어, "시즌 기간이 지난 도장은 임의 획득되지 않아야 한다"는 7단계 검증 기준과 맞지 않는다.

수정안:

- 클라이언트 직접 insert 권한을 제거한다: `drop policy if exists "user_season_stamps_insert_own" on public.user_season_stamps; revoke insert on public.user_season_stamps from authenticated;`
- 획득 판정은 `security definer` RPC로 이동한다. RPC는 `auth.uid()`, `season_stamps.starts_on <= current_date <= season_stamps.ends_on`, 프리미엄 도장일 때 `private.user_has_nyangkkureomi(auth.uid())`를 함께 검사한 뒤 `user_season_stamps`에 upsert한다.
- seed처럼 QA 데이터를 직접 넣는 작업은 로컬/QA DB에서 관리자 권한으로만 실행한다.

현재 `collection_profiles.selected_badge_ids`는 사용자가 실제 획득한 골목 배지인지 검증하지 않는다. 화면은 획득 상태를 별도로 표시하지만, DB 기준의 "진열 가능한 배지는 획득 배지" 규칙은 아직 강제되지 않는다.

수정안:

- `private.validate_collection_profile()`에서 `selected_badge_ids`가 모두 `user_badges`에 존재하는지 검사한다.
- 무료/구독별 배지 진열 개수 제한이 필요하면 같은 트리거에서 무료 최대 개수와 `냥꾸러미` 최대 개수를 분리해 검사한다.
