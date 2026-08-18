import { describe, expect, it } from 'vitest';

import { MAX_HISTORY, applyCommand, createEditorState } from '../editor';
import type { EditorState } from '../editor';
import { fixtureSpecLookup } from '../fixtures';

function place(state: EditorState, id: string, gridX: number, gridY: number) {
  return applyCommand(
    state,
    {
      type: 'place',
      placementId: id,
      furnitureId: 'visitor_cushion_orange',
      surface: 'floor',
      gridX,
      gridY,
    },
    fixtureSpecLookup,
  );
}

describe('editor reducer', () => {
  it('배치 → 이동 → Undo → Redo가 좌표를 정확히 되돌린다', () => {
    let { state } = place(createEditorState(), 'a', 2, 2);
    ({ state } = applyCommand(state, { type: 'move', placementId: 'a', gridX: 8, gridY: 4 }, fixtureSpecLookup));
    expect(state.placements[0]).toMatchObject({ gridX: 8, gridY: 4 });

    ({ state } = applyCommand(state, { type: 'undo' }, fixtureSpecLookup));
    expect(state.placements[0]).toMatchObject({ gridX: 2, gridY: 2 });

    ({ state } = applyCommand(state, { type: 'redo' }, fixtureSpecLookup));
    expect(state.placements[0]).toMatchObject({ gridX: 8, gridY: 4 });
  });

  it('보관(store)과 뒤집기(flip)도 Undo 대상이다', () => {
    let { state } = place(createEditorState(), 'a', 2, 2);
    ({ state } = applyCommand(state, { type: 'flip', placementId: 'a' }, fixtureSpecLookup));
    expect(state.placements[0]?.flipX).toBe(true);

    ({ state } = applyCommand(state, { type: 'store', placementId: 'a' }, fixtureSpecLookup));
    expect(state.placements).toHaveLength(0);

    ({ state } = applyCommand(state, { type: 'undo' }, fixtureSpecLookup));
    expect(state.placements[0]?.flipX).toBe(true);
    ({ state } = applyCommand(state, { type: 'undo' }, fixtureSpecLookup));
    expect(state.placements[0]?.flipX).toBe(false);
  });

  it('유효하지 않은 명령은 상태를 바꾸지 않고 이슈만 돌려준다', () => {
    const first = place(createEditorState(), 'a', 2, 2);
    const overlap = place(first.state, 'b', 2, 2);
    expect(overlap.issues.map((i) => i.code)).toContain('overlap');
    expect(overlap.state).toBe(first.state);
    expect(overlap.state.past).toHaveLength(1);
  });

  it('새 명령은 redo 스택을 비운다', () => {
    let { state } = place(createEditorState(), 'a', 2, 2);
    ({ state } = applyCommand(state, { type: 'undo' }, fixtureSpecLookup));
    expect(state.future).toHaveLength(1);
    ({ state } = place(state, 'b', 10, 2));
    expect(state.future).toHaveLength(0);
  });

  it('히스토리는 20단계에서 절단된다', () => {
    let { state } = place(createEditorState(), 'a', 0, 0);
    for (let i = 0; i < MAX_HISTORY + 10; i += 1) {
      const x = 4 + (i % 2);
      ({ state } = applyCommand(state, { type: 'move', placementId: 'a', gridX: x, gridY: 4 }, fixtureSpecLookup));
    }
    expect(state.past).toHaveLength(MAX_HISTORY);
    // 20번 Undo 후 더 이상 되돌아가지 않는다
    for (let i = 0; i < MAX_HISTORY; i += 1) {
      ({ state } = applyCommand(state, { type: 'undo' }, fixtureSpecLookup));
    }
    const extra = applyCommand(state, { type: 'undo' }, fixtureSpecLookup);
    expect(extra.state.placements).toEqual(state.placements);
    expect(extra.state.past).toHaveLength(0);
  });
});
