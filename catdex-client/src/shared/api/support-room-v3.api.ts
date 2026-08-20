import { supabase } from '@/shared/supabase/client';
import { throwIfSupabaseError } from '@/shared/api/client';
import type { FurnitureId } from '@/features/support-room-v2/domain/furniture';

interface V3PlacementRow {
  furniture_id: string;
  // postgres numeric은 정밀도 보존을 위해 문자열로 온다.
  grid_x: string;
  grid_y: string;
  flip_x: boolean;
  stored: boolean;
}

export interface V3PlacementOverride {
  gridX: number;
  gridY: number;
  flipX: boolean;
  /** 보관함으로 뺀 가구. 방에 그리지 않는다. */
  stored: boolean;
}

export async function fetchSupportRoomV3Placements(): Promise<
  Map<FurnitureId, V3PlacementOverride>
> {
  const { data, error } = await supabase
    .from('support_room_v3_placements')
    .select('furniture_id, grid_x, grid_y, flip_x, stored')
    .eq('room_id', 'main')
    .returns<V3PlacementRow[]>();
  throwIfSupabaseError(error);

  return new Map(
    (data ?? []).map((row) => [
      row.furniture_id as FurnitureId,
      {
        gridX: Number(row.grid_x),
        gridY: Number(row.grid_y),
        flipX: row.flip_x,
        stored: row.stored,
      },
    ]),
  );
}

export async function saveSupportRoomV3Placement(
  furnitureId: FurnitureId,
  gridX: number,
  gridY: number,
  options: { flipX?: boolean; stored?: boolean } = {},
): Promise<void> {
  const { error } = await supabase.rpc('save_support_room_v3_placement', {
    p_room_id: 'main',
    p_furniture_id: furnitureId,
    p_grid_x: gridX,
    p_grid_y: gridY,
    p_flip_x: options.flipX ?? false,
    p_stored: options.stored ?? false,
  });
  throwIfSupabaseError(error);
}
