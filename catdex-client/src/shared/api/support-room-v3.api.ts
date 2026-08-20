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

export interface RoomStageState {
  /** 지금 열려 있는 단계 */
  stage: string;
  /** 바로 다음 단계. 마지막이면 null이다. */
  nextStage: { stage: string; name: string; cost: number } | null;
}

/**
 * 지금 단계와 바로 다음 단계를 함께 읽는다.
 * 다음 단계는 sequence + 1로만 고르므로 건너뛰기가 불가능하다.
 */
export async function fetchSupportRoomStage(): Promise<RoomStageState> {
  const [room, stages] = await Promise.all([
    supabase
      .from('support_rooms')
      .select('stage')
      .eq('room_id', 'main')
      .maybeSingle<{ stage: string }>(),
    supabase
      .from('support_room_stages')
      .select('stage, sequence, name, cost')
      .order('sequence')
      .returns<Array<{ stage: string; sequence: number; name: string; cost: number }>>(),
  ]);
  throwIfSupabaseError(room.error);
  throwIfSupabaseError(stages.error);

  const stage = room.data?.stage ?? 'stage0';
  const list = stages.data ?? [];
  const current = list.find((row) => row.stage === stage);
  const next = current ? list.find((row) => row.sequence === current.sequence + 1) : undefined;

  return {
    stage,
    nextStage: next ? { stage: next.stage, name: next.name, cost: next.cost } : null,
  };
}

/** 방을 한 단계 넓힌다. 잔액과 순서 검사는 서버가 한다. */
export async function expandSupportRoom(
  idempotencyKey: string,
): Promise<{ balance: number; stage: string }> {
  const { data, error } = await supabase.rpc('expand_support_room', {
    p_idempotency_key: idempotencyKey,
  });
  throwIfSupabaseError(error);
  const result = data as { balance?: number; stage?: string };
  return { balance: result.balance ?? 0, stage: result.stage ?? 'stage0' };
}
