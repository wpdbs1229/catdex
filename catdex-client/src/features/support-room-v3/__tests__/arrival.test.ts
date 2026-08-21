import { describe, expect, it } from 'vitest';
import { isFloorCell } from '../render/floor-masks.generated';
import { approachCell, nearestDoor, walkPath } from '../support-room-v3.arrival';
import {
  createDefaultObservationLayout,
  fitPlacementsToStage,
  type ObservationPlacement,
} from '../support-room-v3.layout';
import type { RoomStage } from '../render/shells.generated';

function stepsAreAdjacent(path: readonly { x: number; y: number }[]): boolean {
  return path.every((cell, index) => {
    if (index === 0) return true;
    const previous = path[index - 1];
    // 같은 방향으로 이어진 칸은 한 다리로 묶여 있으므로 축 하나만 달라야 한다.
    return (cell.x === previous.x) !== (cell.y === previous.y);
  });
}

describe('손님이 문에서 자리까지 걸어온다', () => {
  const cases: RoomStage[] = ['stage0', 'stage4'];

  it.each(cases)('%s: 문에서 출발해 가구 앞까지 이어진다', (stage) => {
    const placements = fitPlacementsToStage(createDefaultObservationLayout(), stage);
    const chair = placements.find((item) => item.furnitureId === 'swivel_chair_lavender')!;
    const seat = approachCell(chair, stage, placements);
    const door = nearestDoor(stage, seat);
    const path = walkPath(stage, door.entry, seat, placements);

    expect(path[0]).toEqual(door.entry);
    expect(path[path.length - 1]).toEqual(seat);
    expect(stepsAreAdjacent(path)).toBe(true);
  });

  it('가는 길은 바닥 위로만 지나간다', () => {
    const placements = fitPlacementsToStage(createDefaultObservationLayout(), 'stage4');
    const cushion = placements.find((item) => item.furnitureId === 'visitor_cushion_orange')!;
    const seat = approachCell(cushion, 'stage4', placements);
    const path = walkPath('stage4', nearestDoor('stage4', seat).entry, seat, placements);

    for (const cell of path) {
      expect(isFloorCell('stage4', cell.x, cell.y), `${cell.x},${cell.y}`).toBe(true);
    }
  });

  it('5단계는 목표에서 가까운 문으로 들어온다', () => {
    const annex = nearestDoor('stage4', { x: 36, y: 8 });
    const main = nearestDoor('stage4', { x: 3, y: 12 });
    expect(annex.entry).not.toEqual(main.entry);
  });

  it('가구를 옮기면 서는 자리도 따라온다', () => {
    const base: ObservationPlacement = { furnitureId: 'visitor_cushion_orange', gridX: 2, gridY: 2 };
    const moved: ObservationPlacement = { ...base, gridX: 5, gridY: 4 };
    expect(approachCell(moved, 'stage0')).not.toEqual(approachCell(base, 'stage0'));
  });
});
