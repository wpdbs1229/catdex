import type { RoomStage } from './render/shells.generated';
import { STAGE_LABELS } from './support-room-v3.assets';

/**
 * 다음 단계로 넓히는 데 드는 복지포인트.
 *
 * 화면에는 "1,760 BP"와 "41%"가 잔액(4,000 BP)과 무관하게 박혀 있었다.
 * 둘 다 여기서 계산해야 서로 어긋나지 않는다.
 */
export const STAGE_UNLOCK_COST: Record<RoomStage, number> = {
  stage0: 0,
  // 하루 3마리 기준 수입 곡선에 맞춘 값이다. stage1은 5일차,
  // 카탈로그 전체(25,000P)와 합쳐 30일차에 완주하도록 잡았다.
  stage1: 8_000,
  stage2: 22_000,
  stage3: 48_000,
  stage4: 95_000,
};

const STAGE_ORDER: readonly RoomStage[] = ['stage0', 'stage1', 'stage2', 'stage3', 'stage4'];

export interface ExpansionProgress {
  /** 다음 단계. 마지막 단계면 null이다. */
  nextStage: RoomStage | null;
  /** 0~1 */
  ratio: number;
  percent: number;
  /** 아직 모자란 금액. 이미 모았으면 0이다. */
  remaining: number;
  cost: number;
  label: string;
}

/**
 * 잔액 하나에서 문구와 막대를 함께 만든다.
 * 표기는 "남은 값" 쪽으로 통일한다 - 사용자가 알고 싶은 건 얼마나 더 모아야
 * 하는지이고, 누적치는 잔액 칩에 이미 나와 있다.
 */
export function calculateExpansionProgress(
  balance: number,
  stage: RoomStage,
): ExpansionProgress {
  const nextIndex = STAGE_ORDER.indexOf(stage) + 1;
  const nextStage = STAGE_ORDER[nextIndex] ?? null;

  if (!nextStage) {
    return {
      nextStage: null,
      ratio: 1,
      percent: 100,
      remaining: 0,
      cost: 0,
      label: '마지막 단계까지 넓혔어요',
    };
  }

  const cost = STAGE_UNLOCK_COST[nextStage];
  const safeBalance = Math.max(0, balance);
  const ratio = cost === 0 ? 1 : Math.min(1, safeBalance / cost);
  const remaining = Math.max(0, cost - safeBalance);

  return {
    nextStage,
    ratio,
    percent: Math.floor(ratio * 100),
    remaining,
    cost,
    label:
      remaining === 0
        ? `${STAGE_LABELS[nextStage]}로 넓힐 수 있어요`
        : `${STAGE_LABELS[nextStage]}까지 ${remaining.toLocaleString()} BP 남음`,
  };
}
