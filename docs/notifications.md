# 냥도감 알림 전환 문서

## 현재 상태

- 이전 앱에는 `MY > 알림 설정` 메뉴 텍스트만 있고 실제 화면 전환, 권한 요청, 스케줄링, 푸시 토큰 저장 로직이 없었다.
- `expo-notifications` 의존성을 추가했고 로컬 알림과 Expo Push Token 등록 기반을 구현했다.
- Supabase 알림 설정, 기기 토큰, 알림 이벤트/발송 큐 테이블과 Edge Function 발송기를 추가했다.

## 구현해야 할 알림

1. **탐험 리마인더**
   - 사용자가 선택한 시간에 "오늘 동네 고양이를 기록해보세요" 로컬 알림을 보낸다.
   - 서버 없이 앱 단독으로 구현 가능하므로 1차 구현 범위에 포함한다.

2. **새 공유 고양이 알림**
   - 사용자가 저장한 동네 단위 지역에 새 공유 고양이가 등록되면 알린다.
   - 정확한 좌표는 저장하지 않고 지역명/지역 id 기준으로만 발송한다.
   - Supabase Edge Function 또는 DB 트리거 기반 서버 푸시가 필요하다.

3. **재발견/배지/레벨 알림**
   - 재발견 기록, 첫 등록, 배지 획득, 레벨업 같은 즉시 피드백을 알린다.
   - 앱 실행 중에는 로컬 알림으로 처리할 수 있고, 백그라운드 발송은 서버 이벤트 큐가 필요하다.

4. **소셜 알림**
   - 내 공개 도감 좋아요, 팔로우, 랭킹 변화 알림을 보낸다.
   - Supabase social 테이블의 변경 이벤트를 기반으로 서버 푸시가 필요하다.

## 1차 구현 범위

- `expo-notifications` 설치 및 앱 설정 추가
- 알림 권한 요청
- 알림 설정 화면 추가
- 탐험 리마인더 on/off 및 시간 저장
- 로컬 알림 스케줄링/취소
- 새 공유 고양이, 배지/레벨, 소셜 알림은 설정 항목으로 먼저 노출하되 서버 푸시 발송은 후속 단계로 남긴다.

## 후속 Supabase 범위

- `notification_settings`
  - `user_id`, `daily_reminder_enabled`, `daily_reminder_time`, `shared_cat_enabled`, `achievement_enabled`, `social_enabled`
- `notification_devices`
  - `user_id`, `expo_push_token`, `platform`, `last_seen_at`
- `notification_events`
  - 알림 종류, 대상 사용자, payload, 발송 상태를 저장한다.
- Edge Function
  - Expo Push API로 서버 푸시를 전송한다.

## Supabase 구현 내용

- `supabase/migrations/000011_notification_push_infrastructure.sql`
  - `notification_settings`, `notification_devices`, `notification_events` 테이블을 추가한다.
  - 세 테이블 모두 RLS를 활성화한다.
  - 사용자는 자신의 알림 설정과 기기 토큰만 조회/생성/수정/삭제할 수 있다.
  - 사용자는 자신에게 발송된 알림 이벤트만 조회할 수 있고, 이벤트 생성/상태 변경은 DB 트리거와 service role 기반 Edge Function이 담당한다.
- DB 트리거
  - `cat_sightings` insert: 같은 지역을 기록한 사용자 중 공유 고양이 알림을 끄지 않은 사용자에게 `shared_cat` 이벤트를 만든다.
  - `user_badges` insert: 배지 알림을 끄지 않은 사용자에게 `achievement` 이벤트를 만든다.
  - `collection_likes` insert: 도감 주인에게 `collection_like` 이벤트를 만든다.
  - `collection_follows` insert: 도감 주인에게 `collection_follow` 이벤트를 만든다.
- `supabase/functions/notification-dispatch/index.ts`
  - `pending` 이벤트를 가져와 Expo Push API로 발송한다.
  - 기기 토큰이 없으면 `skipped`, 발송 성공은 `sent`, 실패는 `failed`로 상태를 갱신한다.
  - `NOTIFICATION_DISPATCH_SECRET`이 설정되어 있으면 `Authorization: Bearer <secret>` 요청만 허용한다.
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 환경 변수가 필요하다.

## 클라이언트 구현 내용

- `MY > 알림 설정` 화면에서 권한 요청, 탐험 리마인더 시간 선택, 알림 종류별 on/off를 제공한다.
- 알림 설정은 AsyncStorage에 저장하고, 로그인 사용자는 Supabase `notification_settings`와 동기화한다.
- 권한 허용 후 Expo Push Token을 발급받아 `notification_devices`에 등록한다.
- 탐험 리마인더는 로컬 daily notification으로 처리한다.

## 검증 기준

- 타입 체크가 통과해야 한다.
- MY 화면에서 알림 설정 화면으로 이동해야 한다.
- 권한 요청 버튼이 실제 권한 API를 호출해야 한다.
- 탐험 리마인더를 켜면 로컬 알림 스케줄 id가 저장되고, 끄면 취소되어야 한다.
- Supabase CLI가 없는 환경에서는 migration 적용 검증 대신 SQL 정적 검토와 클라이언트 타입 체크로 검증한다.
