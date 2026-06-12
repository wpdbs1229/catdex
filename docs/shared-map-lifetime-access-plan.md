# 공유지도 평생 이용권 전환 문서

## 목표

- 홈 지도에서 `개인지도`와 `공유지도`를 전환한다.
- 공유지도는 다른 사용자가 공개한 고양이 수집 기록을 지역 단위로 보여준다.
- 공유지도 미구매자는 설명과 `15,900원` 평생 이용권 구매 CTA를 본다.

## 제품 원칙

- 정확 GPS/EXIF 위치는 공유지도에 노출하지 않는다.
- 공개 지도 데이터는 `regions`의 중심 좌표와 반경을 사용하고, 반경은 최소 500m로 흐린다.
- 공유지도 RPC는 현재 사용자의 고양이를 제외하고 다른 사용자의 공개 가능한 고양이만 반환한다.

## 클라이언트 방향

- `MapScreen`은 같은 지도/필터/목록 UI를 `개인지도`와 `공유지도` 데이터 소스로 재사용한다.
- 공유지도 권한이 없으면 지도 위에 잠금 안내와 구매 CTA를 표시한다.
- 구매 CTA는 RevenueCat SDK를 통해 App Store/Google Play 인앱결제를 시작한다.
- 구매 복원은 RevenueCat `restorePurchases()`로 처리한다.
- RevenueCat app user id는 Supabase Auth user id를 사용한다.

## 서버 방향

- `user_entitlements.tier`에 `shared_map_lifetime`을 추가한다.
- `get_shared_map_regions()` RPC는 인증 사용자만 호출할 수 있고, own entitlement RLS를 통과한 사용자에게만 데이터를 반환한다.
- RevenueCat 웹훅은 `shared_map` entitlement 이벤트만 처리하고 `shared_map_lifetime` 권한을 갱신한다.

## 결제 참고

- iOS/Android 앱 안에서 공유지도 기능 잠금을 해제하는 결제는 App Store/Google Play 인앱결제를 사용한다.
- RevenueCat 상품은 `shared_map_lifetime`, entitlement는 `shared_map`으로 둔다.

## 검증

- `cd catdex-client && npm run typecheck`
- Supabase CLI가 준비되면 새 마이그레이션 적용 후 `get_shared_map_regions()`를 권한 있음/없음 계정으로 각각 검증한다.
- RevenueCat Offering에 `shared_map_lifetime` 상품이 없으면 앱은 설정 오류 메시지를 보여야 한다.
- 구매 완료 후 RevenueCat 웹훅이 `user_entitlements.tier = 'shared_map_lifetime'` 행을 갱신해야 한다.
