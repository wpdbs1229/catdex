# 냥도감 알림 계획

## 현재 범위

알림은 기본 수집 경험을 보조하는 범위로 유지한다.

- 탐험 리마인더: 사용자가 선택한 시간에 로컬 알림을 보낸다.
- 새 공유 고양이 알림: 지역 단위 제보가 생겼을 때 서버 푸시 큐를 통해 알릴 수 있다.

장식, 공개 반응, 획득 보상 기반 알림은 현재 범위에 포함하지 않는다.

## 클라이언트

- `MY > 알림 설정`에서 권한 요청, 리마인더 on/off, 시간 선택, 새 공유 고양이 알림 on/off를 제공한다.
- 설정은 AsyncStorage에 저장하고, 로그인 사용자는 Supabase `notification_settings`와 동기화한다.
- 권한 허용 후 Expo Push Token을 발급받아 `notification_devices`에 등록한다.
- 미리보기 알림은 로컬 알림으로 즉시 발송한다.

## Supabase

- `notification_settings`
  - `user_id`, `daily_reminder_enabled`, `daily_reminder_time`, `shared_cat_enabled`
- `notification_devices`
  - `user_id`, `expo_push_token`, `platform`, `last_seen_at`
- `notification_events`
  - 현재 이벤트 타입은 `shared_cat`만 유지한다.
- `notification-dispatch`
  - `pending` 이벤트를 가져와 Expo Push API로 발송한다.
  - `NOTIFICATION_DISPATCH_SECRET`이 없으면 실행하지 않고, `Authorization: Bearer <secret>` 요청만 허용한다.

## 검증 기준

- 타입 체크가 통과해야 한다.
- MY 화면에서 알림 설정 화면으로 이동해야 한다.
- 권한 요청 버튼이 실제 권한 API를 호출해야 한다.
- 리마인더를 켜면 로컬 알림 스케줄 id가 저장되고, 끄면 취소되어야 한다.
- 알림 설정 저장 시 제거된 컬럼 없이 Supabase에 upsert되어야 한다.
- dispatch 함수는 `shared_cat` 이벤트만 처리해야 한다.
