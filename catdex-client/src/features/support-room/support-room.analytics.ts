import type { PropId } from '@/features/support-room/support-room.assets';
import type { ZoneId } from '@/features/support-room/support-room.domain';

/**
 * 고객지원실 분석 이벤트.
 *
 * 검증하려는 가설은 하나다 - "새 고객 장면이 생겼을까"라는 기대가 재방문을
 * 만드는가. 그래서 진입·발견·재방문만 센다.
 *
 * **개인을 알아볼 수 있는 값은 넣지 않는다.** 고양이 이름, 사진 주소, 털색
 * 원문은 속성으로 보내지 않는다. 어떤 그림을 골랐는지(characterAssetKey)와
 * 어떤 비품인지 정도만 남긴다.
 */
export type SupportRoomEvent =
  | { name: 'support_room_open'; sceneCount: number; unreadCount: number }
  | { name: 'support_room_first_scene_seen'; zoneId: ZoneId; propId: PropId }
  | { name: 'support_room_zone_view'; zoneId: ZoneId }
  | { name: 'support_room_minimap_tap'; zoneId: ZoneId }
  | { name: 'support_record_discovered'; propId: PropId; discoveredTotal: number }
  | { name: 'support_log_open'; recordCount: number; unreadCount: number }
  | { name: 'support_prop_unlocked'; propId: PropId; discoveredTotal: number }
  | { name: 'support_prop_changed'; zoneId: ZoneId; propId: PropId }
  | { name: 'support_room_return'; hoursSinceLastOpen: number };

/**
 * 지금은 어디로도 보내지 않는다.
 *
 * SDK를 붙이는 건 재방문 지표를 실제로 볼 준비가 됐을 때다. 그전에 넣으면
 * 쓰지도 않을 의존성과 동의 절차가 먼저 생긴다. 호출 지점과 속성 모양만
 * 먼저 굳혀 두면, 나중에 이 함수 하나만 갈아 끼우면 된다.
 */
export function trackSupportRoom(event: SupportRoomEvent): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event.name, event);
  }
}
