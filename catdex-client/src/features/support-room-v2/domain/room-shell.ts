import type { GridPoint, GridSize } from './grid';
import { FLOOR_GRID, WALL_GRID } from './grid';

/**
 * 방 건축 구조(셸) 설정. 문·통로 규칙을 상수로 숨기지 않고 여기서 명시한다.
 * docs/13: 출입문 여유 최소 2칸, 가로 통로 최소 2행.
 */
export interface RoomDoor {
  id: string;
  /** 문 앞에서 항상 비워 두어야 하는 바닥 셀. 고양이 spawn/exit 지점이기도 하다. */
  clearanceCells: readonly GridPoint[];
}

export interface RoomShellConfig {
  floor: GridSize;
  wall: GridSize;
  doors: readonly RoomDoor[];
  /** 좌우를 잇는 통로가 유지해야 하는 최소 연속 행 수. */
  requiredWalkwayRows: number;
}

// ponytail: 문 위치 셀은 셸 배경(3859×2166) 시각 검수 전 임시값. Stage 2 편집기에서
// 배경 위 그리드 오버레이로 확인한 뒤 이 설정만 갱신하면 된다.
export const DEFAULT_ROOM_SHELL: RoomShellConfig = {
  floor: FLOOR_GRID,
  wall: WALL_GRID,
  doors: [
    {
      // 좌측 외부 출입문: 바닥 왼쪽 가장자리 중간 깊이
      id: 'entrance_exterior_left',
      clearanceCells: [
        { x: 0, y: 3 },
        { x: 0, y: 4 },
        { x: 1, y: 3 },
        { x: 1, y: 4 },
      ],
    },
    {
      // 중앙 우측 내부문(원본 x≈2290~2540 → 18~19열): 뒷벽 쪽 바닥 앞 2칸
      id: 'door_interior_center_right',
      clearanceCells: [
        { x: 18, y: 0 },
        { x: 18, y: 1 },
        { x: 19, y: 0 },
        { x: 19, y: 1 },
      ],
    },
  ],
  requiredWalkwayRows: 2,
};
