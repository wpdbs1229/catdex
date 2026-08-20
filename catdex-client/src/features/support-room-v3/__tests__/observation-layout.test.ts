import { describe, expect, it } from 'vitest';
import { FURNITURE_CATALOG } from '@/features/support-room-v2/domain/catalog.generated';
import { FURNITURE_ANCHORS } from '../render/furniture-anchors.generated';
import { createProjection } from '../render/projection';
import { SHELL_GEOMETRY } from '../render/shells.generated';
import {
  CALIBRATED_STAGES,
  STAGE0_CENTER_AISLE,
  STAGE0_DOOR_CLEARANCES,
  stageRules,
  createDefaultObservationLayout,
  observationFootprintCoverage,
  primaryIssueText,
  validateObservationLayout,
  type ObservationPlacement,
} from '../support-room-v3.layout';

const base = createDefaultObservationLayout();

function moved(furnitureId: string, gridX: number, gridY: number): ObservationPlacement[] {
  return base.map((placement) =>
    placement.furnitureId === furnitureId ? { ...placement, gridX, gridY } : placement,
  );
}

describe('관찰 모드 기본 배치', () => {
  it('기본 배치가 모든 규칙을 통과한다', () => {
    expect(validateObservationLayout(base)).toEqual([]);
  });

  it('바닥을 35% 넘게 채우지 않는다', () => {
    expect(observationFootprintCoverage(base)).toBeLessThanOrEqual(0.35);
  });

  it('출입문 앞 2×2를 침범하면 잡아낸다', () => {
    const clearance = STAGE0_DOOR_CLEARANCES[0];
    const issues = validateObservationLayout(
      moved('visitor_cushion_orange', clearance.x, clearance.y),
    );
    expect(issues).toContain('door_blocked');
  });

  it('가운데 통로를 막으면 잡아낸다', () => {
    const issues = validateObservationLayout(
      moved('visitor_cushion_orange', STAGE0_CENTER_AISLE.x, STAGE0_CENTER_AISLE.y),
    );
    expect(issues).toContain('aisle_blocked');
  });

  it('방 밖으로 나가면 잡아낸다', () => {
    expect(validateObservationLayout(moved('consultation_desk_honey', 7, 5))).toContain(
      'out_of_bounds',
    );
  });

  it('격자는 안 겹쳐도 그림이 고양이를 가리면 잡아낸다', () => {
    // 의자 바로 앞 칸으로 화분을 옮긴다. footprint는 맞닿기만 하고 겹치지 않지만
    // 큰 화분 그림이 고양이 몸을 덮는다. 좌표를 박아두면 배치를 손볼 때마다
    // 깨지므로 의자 위치에서 계산한다.
    const chair = base.find((placement) => placement.furnitureId === 'swivel_chair_lavender');
    if (!chair) throw new Error('의자가 기본 배치에 없다');
    const chairDepth = FURNITURE_ANCHORS.swivel_chair_lavender.footprintD;
    const issues = validateObservationLayout(
      moved('plant_small_desk', chair.gridX, chair.gridY + chairDepth),
    );
    expect(issues).toContain('cat_occluded');
    expect(issues).not.toContain('overlap');
  });

  it('좁은 화면에서 가구가 잘리면 잡아낸다', () => {
    const projection = createProjection('stage0', 0.4);
    const issues = validateObservationLayout(base, {
      projection,
      // 셸보다 한참 좁은 화면이면 양옆 가구가 safe area 밖으로 나간다.
      viewportWidth: 200,
    });
    expect(issues).toContain('outside_safe_area');
  });

  it('여러 이유가 겹치면 가장 먼저 고칠 하나만 말한다', () => {
    expect(primaryIssueText(['cat_occluded', 'overlap'])).toBe('다른 가구와 겹쳐요');
    expect(primaryIssueText([])).toBeNull();
  });
});

describe('기본 배치와 보관함', () => {
  it('기본 배치가 놓는 가구는 전부 시작 지급이다', () => {
    for (const placement of base) {
      const entry = FURNITURE_CATALOG.find((f) => f.id === placement.furnitureId);
      expect(entry?.acquisition, placement.furnitureId).toBe('starter');
    }
  });
});

describe('단계별 방 규칙', () => {
  it('열 수 있는 단계는 문 위치와 통로가 모두 정의돼 있다', () => {
    expect(CALIBRATED_STAGES.length).toBeGreaterThan(0);
    for (const stage of CALIBRATED_STAGES) {
      const rules = stageRules(stage);
      expect(rules.doorClearances.length, stage).toBeGreaterThan(0);
      expect(rules.centerAisle.width, stage).toBeGreaterThan(0);
    }
  });

  it('열 수 있는 단계는 칸이 정사각형이다', () => {
    for (const stage of CALIBRATED_STAGES) {
      const { axisX, axisY } = SHELL_GEOMETRY[stage];
      const ratio = Math.hypot(axisY.x, axisY.y) / Math.hypot(axisX.x, axisX.y);
      expect(ratio, stage).toBeGreaterThan(0.95);
      expect(ratio, stage).toBeLessThan(1.05);
    }
  });

  it('stage1은 방이 넓어져 기본 배치가 그대로 통과한다', () => {
    expect(validateObservationLayout(base, { stage: 'stage1' })).toEqual([]);
  });

  it('stage1 문 앞을 막으면 잡아낸다', () => {
    const clearance = stageRules('stage1').doorClearances[0];
    const issues = validateObservationLayout(
      moved('visitor_cushion_orange', clearance.x, clearance.y),
      { stage: 'stage1' },
    );
    expect(issues).toContain('door_blocked');
  });
});
