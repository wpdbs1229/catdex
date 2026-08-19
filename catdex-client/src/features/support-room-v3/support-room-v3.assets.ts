/**
 * 확장 단계별 통짜 방 셸. 1254×1254 RGBA WebP라 벽·바닥·문·창이 한 광원과
 * 카메라를 공유한다. 가구 좌표 보정은 render/shells.generated.ts에 있다.
 */
import type { RoomStage } from './render/shells.generated';

type ImageSource = ReturnType<typeof require>;

export const V3_SHELL_IMAGES: Record<RoomStage, ImageSource> = {
  stage0: require('../../../assets/support-room-v3/shells/stage0.webp'),
  stage1: require('../../../assets/support-room-v3/shells/stage1.webp'),
  stage2: require('../../../assets/support-room-v3/shells/stage2.webp'),
  stage3: require('../../../assets/support-room-v3/shells/stage3.webp'),
  stage4: require('../../../assets/support-room-v3/shells/stage4.webp'),
};

export const STAGE_LABELS: Record<RoomStage, string> = {
  stage0: '임시 상담실',
  stage1: '정식 고객지원실',
  stage2: '행운동 지부',
  stage3: '확장 지부',
  stage4: '본관 · 별관',
};
