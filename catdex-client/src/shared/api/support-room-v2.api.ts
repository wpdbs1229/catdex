import { supabase } from '@/shared/supabase/client';
import { throwIfSupabaseError } from '@/shared/api/client';
import type { FurnitureId, SurfaceId } from '@/features/support-room-v2/domain/furniture';
import type { Placement } from '@/features/support-room-v2/domain/placement';

/** 서버 정본 스냅숏. layout_version은 낙관적 잠금의 기준이다. */
export interface SupportRoomV2Snapshot {
  layoutVersion: number;
  wallSurfaceId: SurfaceId;
  floorSurfaceId: SurfaceId;
  migrationVersion: number;
  placements: Placement[];
}

export type SaveLayoutResult =
  | { status: 'ok'; layoutVersion: number }
  | { status: 'conflict'; serverVersion: number };

interface SupportRoomRow {
  layout_version: number;
  wall_surface_id: string;
  floor_surface_id: string;
  migration_version: number;
}

interface PlacementRow {
  placement_id: string;
  furniture_id: string;
  surface: string;
  grid_x: number;
  grid_y: number;
  flip_x: boolean;
}

interface InventoryRow {
  item_id: string;
  owned_quantity: number;
}

export async function ensureSupportRoomSetup(): Promise<void> {
  const { error } = await supabase.rpc('ensure_support_room_setup');
  throwIfSupabaseError(error);
}

export async function fetchSupportRoomV2(): Promise<SupportRoomV2Snapshot | null> {
  const { data: room, error } = await supabase
    .from('support_rooms')
    .select('layout_version, wall_surface_id, floor_surface_id, migration_version')
    .eq('room_id', 'main')
    .maybeSingle<SupportRoomRow>();
  throwIfSupabaseError(error);
  if (!room) return null;

  const { data: placementRows, error: placementError } = await supabase
    .from('support_room_placements')
    .select('placement_id, furniture_id, surface, grid_x, grid_y, flip_x')
    .eq('room_id', 'main')
    .returns<PlacementRow[]>();
  throwIfSupabaseError(placementError);

  return {
    layoutVersion: room.layout_version,
    wallSurfaceId: room.wall_surface_id as SurfaceId,
    floorSurfaceId: room.floor_surface_id as SurfaceId,
    migrationVersion: room.migration_version,
    placements: (placementRows ?? []).map((row) => ({
      placementId: row.placement_id,
      furnitureId: row.furniture_id as FurnitureId,
      surface: row.surface === 'wall' ? 'wall' : 'floor',
      gridX: row.grid_x,
      gridY: row.grid_y,
      flipX: row.flip_x,
    })),
  };
}

/** 가구·표면 공통 소유 수량. 키는 카탈로그 item_id. */
export async function fetchSupportRoomInventory(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('support_room_inventory')
    .select('item_id, owned_quantity')
    .returns<InventoryRow[]>();
  throwIfSupabaseError(error);
  return new Map((data ?? []).map((row) => [row.item_id, row.owned_quantity]));
}

export async function fetchWelfarePointBalance(): Promise<number> {
  const { data, error } = await supabase
    .from('support_room_wallets')
    .select('balance')
    .maybeSingle<{ balance: number }>();
  throwIfSupabaseError(error);
  return data?.balance ?? 0;
}

export async function saveSupportRoomLayout(
  expectedVersion: number,
  wallSurfaceId: SurfaceId,
  floorSurfaceId: SurfaceId,
  placements: readonly Placement[],
): Promise<SaveLayoutResult> {
  const { data, error } = await supabase.rpc('save_support_room_layout', {
    p_room_id: 'main',
    p_expected_version: expectedVersion,
    p_wall_surface_id: wallSurfaceId,
    p_floor_surface_id: floorSurfaceId,
    p_placements: placements.map((p) => ({
      placementId: p.placementId,
      furnitureId: p.furnitureId,
      surface: p.surface,
      gridX: p.gridX,
      gridY: p.gridY,
      flipX: p.flipX,
    })),
  });
  throwIfSupabaseError(error);
  const result = data as { status: string; layoutVersion?: number; serverVersion?: number };
  if (result.status === 'conflict') {
    return { status: 'conflict', serverVersion: result.serverVersion ?? 0 };
  }
  return { status: 'ok', layoutVersion: result.layoutVersion ?? expectedVersion + 1 };
}

export interface PurchaseResult {
  status: 'ok' | 'duplicate';
  balance: number;
  ownedQuantity: number;
}

/** 가격 검증·차감·원장·보관함 증가는 전부 서버. 같은 키 재호출은 중복 차감 없음. */
export async function purchaseSupportRoomItem(
  idempotencyKey: string,
  itemId: string,
): Promise<PurchaseResult> {
  const { data, error } = await supabase.rpc('purchase_support_room_item', {
    p_idempotency_key: idempotencyKey,
    p_item_id: itemId,
  });
  throwIfSupabaseError(error);
  const result = data as { status: string; balance?: number; ownedQuantity?: number };
  return {
    status: result.status === 'duplicate' ? 'duplicate' : 'ok',
    balance: result.balance ?? 0,
    ownedQuantity: result.ownedQuantity ?? 0,
  };
}

export async function migrateSupportRoomV1(
  unlockedFurniture: readonly FurnitureId[],
  layout: readonly Placement[],
): Promise<'ok' | 'already_migrated'> {
  const { data, error } = await supabase.rpc('migrate_support_room_v1', {
    p_unlocked_furniture: unlockedFurniture,
    p_layout: layout.map((p) => ({
      placementId: p.placementId,
      furnitureId: p.furnitureId,
      surface: p.surface,
      gridX: p.gridX,
      gridY: p.gridY,
      flipX: p.flipX,
    })),
  });
  throwIfSupabaseError(error);
  return (data as { status: string }).status === 'already_migrated' ? 'already_migrated' : 'ok';
}
