/**
 * 고객지원실 V2 기능 플래그.
 * .env에 EXPO_PUBLIC_SUPPORT_ROOM_V2=true를 넣으면 기존 ClientSupportRoom 라우트가
 * V2 화면으로 교체된다. Babel이 빌드 시 인라인하므로 꺼진 쪽 코드는 번들에서 빠진다.
 */
export const SUPPORT_ROOM_V2_ENABLED = process.env.EXPO_PUBLIC_SUPPORT_ROOM_V2 === 'true';
