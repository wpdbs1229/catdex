/**
 * 고객지원실 V2 기능 플래그.
 * .env에 EXPO_PUBLIC_SUPPORT_ROOM_V2=true를 넣으면 기존 ClientSupportRoom 라우트가
 * V2 화면으로 교체된다. Babel이 빌드 시 인라인하므로 꺼진 쪽 코드는 번들에서 빠진다.
 */
export const SUPPORT_ROOM_V2_ENABLED = process.env.EXPO_PUBLIC_SUPPORT_ROOM_V2 === 'true';

/**
 * V3 스파이크 플래그. 켜면 ClientSupportRoom이 아이소메트릭 스파이크 화면으로 열린다.
 * V2보다 우선한다. (docs/16 프롬프트 A 검증용)
 */
export const SUPPORT_ROOM_V3_SPIKE_ENABLED = process.env.EXPO_PUBLIC_SUPPORT_ROOM_V3 === 'true';
