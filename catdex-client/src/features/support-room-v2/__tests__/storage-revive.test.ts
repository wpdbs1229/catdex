import { describe, expect, it, vi } from 'vitest';

// 순수 revive만 검증한다. AsyncStorage·auth는 로드 경로에서만 쓰이므로 목으로 끊는다.
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}));
vi.mock('@/shared/api/auth.api', () => ({ getCurrentUserId: vi.fn() }));

const { reviveStoredRoomV2, createInitialStoredRoomV2 } = await import('../support-room-v2.storage');

const validLayout = {
  placements: [
    { placementId: 'p1', furnitureId: 'visitor_cushion_orange', surface: 'floor', gridX: 5, gridY: 5, flipX: false },
  ],
  wallSurfaceId: 'wallpaper_cream_plaster',
  floorSurfaceId: 'flooring_honey_oak',
};

describe('reviveStoredRoomV2', () => {
  it('정상 스냅숏·draft를 그대로 살린다', () => {
    const revived = reviveStoredRoomV2({
      schemaVersion: 2,
      snapshot: { ...validLayout, layoutVersion: 3 },
      draft: { ...validLayout, baseVersion: 3 },
      v1MigrationDone: true,
    });
    expect(revived.snapshot?.layoutVersion).toBe(3);
    expect(revived.snapshot?.placements).toHaveLength(1);
    expect(revived.draft?.baseVersion).toBe(3);
    expect(revived.v1MigrationDone).toBe(true);
  });

  it('schemaVersion이 다르면 초기 상태로 시작한다', () => {
    expect(reviveStoredRoomV2({ schemaVersion: 1, snapshot: null })).toEqual(
      createInitialStoredRoomV2(),
    );
  });

  it('깨진 placement는 버리고 나머지만 살린다', () => {
    const revived = reviveStoredRoomV2({
      schemaVersion: 2,
      snapshot: {
        ...validLayout,
        layoutVersion: 1,
        placements: [
          ...validLayout.placements,
          { placementId: 'bad', furnitureId: 'visitor_cushion_orange', surface: 'floor', gridX: 99, gridY: 0, flipX: false },
          { placementId: 42 },
        ],
      },
      draft: null,
      v1MigrationDone: false,
    });
    expect(revived.snapshot?.placements.map((p) => p.placementId)).toEqual(['p1']);
  });

  it('baseVersion 없는 draft는 버린다', () => {
    const revived = reviveStoredRoomV2({
      schemaVersion: 2,
      snapshot: null,
      draft: { ...validLayout },
      v1MigrationDone: false,
    });
    expect(revived.draft).toBeNull();
  });
});
