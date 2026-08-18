import type { Surface } from './grid';
import type { FurnitureId } from './furniture';
import type { Placement, PlacementIssue, SpecLookup } from './placement';
import { validatePlacement } from './placement';

export const MAX_HISTORY = 20;

export interface EditorState {
  placements: readonly Placement[];
  past: readonly (readonly Placement[])[];
  future: readonly (readonly Placement[])[];
}

export type EditorCommand =
  | {
      type: 'place';
      placementId: string;
      furnitureId: FurnitureId;
      surface: Surface;
      gridX: number;
      gridY: number;
      flipX?: boolean;
    }
  | { type: 'move'; placementId: string; gridX: number; gridY: number }
  | { type: 'store'; placementId: string }
  | { type: 'flip'; placementId: string }
  | { type: 'undo' }
  | { type: 'redo' };

export interface EditorResult {
  state: EditorState;
  issues: PlacementIssue[];
}

export function createEditorState(placements: readonly Placement[] = []): EditorState {
  return { placements, past: [], future: [] };
}

function commit(state: EditorState, placements: readonly Placement[]): EditorState {
  const past = [...state.past, state.placements].slice(-MAX_HISTORY);
  return { placements, past, future: [] };
}

/**
 * 편집 명령 적용. 하드 유효성(경계·충돌·표면)에 걸리면 상태를 바꾸지 않고 이슈를 돌려준다.
 * 문·통로·앵커 검사는 저장 시 validateLayout으로 별도 수행한다.
 */
export function applyCommand(
  state: EditorState,
  command: EditorCommand,
  lookup: SpecLookup,
): EditorResult {
  switch (command.type) {
    case 'undo': {
      if (state.past.length === 0) return { state, issues: [] };
      const previous = state.past[state.past.length - 1];
      return {
        state: {
          placements: previous,
          past: state.past.slice(0, -1),
          future: [state.placements, ...state.future],
        },
        issues: [],
      };
    }
    case 'redo': {
      if (state.future.length === 0) return { state, issues: [] };
      const [next, ...rest] = state.future;
      return {
        state: {
          placements: next,
          past: [...state.past, state.placements].slice(-MAX_HISTORY),
          future: rest,
        },
        issues: [],
      };
    }
    case 'place': {
      const candidate: Placement = {
        placementId: command.placementId,
        furnitureId: command.furnitureId,
        surface: command.surface,
        gridX: command.gridX,
        gridY: command.gridY,
        flipX: command.flipX ?? false,
      };
      const issues = validatePlacement(candidate, state.placements, lookup);
      if (issues.length > 0) return { state, issues };
      return { state: commit(state, [...state.placements, candidate]), issues: [] };
    }
    case 'move':
    case 'flip': {
      const existing = state.placements.find((p) => p.placementId === command.placementId);
      if (!existing) return { state, issues: [] };
      const moved: Placement =
        command.type === 'move'
          ? { ...existing, gridX: command.gridX, gridY: command.gridY }
          : { ...existing, flipX: !existing.flipX };
      const others = state.placements.filter((p) => p.placementId !== command.placementId);
      const issues = validatePlacement(moved, others, lookup);
      if (issues.length > 0) return { state, issues };
      return { state: commit(state, [...others, moved]), issues: [] };
    }
    case 'store': {
      const remaining = state.placements.filter((p) => p.placementId !== command.placementId);
      if (remaining.length === state.placements.length) return { state, issues: [] };
      return { state: commit(state, remaining), issues: [] };
    }
  }
}
