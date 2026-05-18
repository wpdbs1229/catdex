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

Supabase 동기화:

- RevenueCat webhook URL은 `supabase/functions/revenuecat-webhook` 배포 URL을 사용한다.
- webhook Authorization 헤더는 `Bearer ${REVENUECAT_WEBHOOK_SECRET}` 형식으로 설정한다.
- Edge Function은 webhook의 `app_user_id`를 `user_entitlements.user_id`로 사용한다.
- 구독 취소 후에도 만료일이 남아 있으면 `status = canceled`, `current_period_ends_at > now()` 상태로 `냥꾸러미` 접근을 유지한다.
