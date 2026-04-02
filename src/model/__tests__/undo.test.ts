import { describe, it, expect } from 'vitest';
import { createUndoManager, pushState, undo, redo, canUndo, canRedo } from '../undo';
import { createInitialState } from '../state';
import type { ModelisationState } from '../types';

function makeState(probleme: string): ModelisationState {
  return createInitialState(probleme);
}

describe('createUndoManager', () => {
  it('creates with empty past and future', () => {
    const initial = makeState('');
    const um = createUndoManager(initial);
    expect(um.past).toEqual([]);
    expect(um.future).toEqual([]);
    expect(um.current).toBe(initial);
  });
});

describe('pushState', () => {
  it('adds current to past, sets new current, clears future', () => {
    const s0 = makeState('s0');
    const s1 = makeState('s1');
    let um = createUndoManager(s0);
    um = pushState(um, s1);

    expect(um.past).toHaveLength(1);
    expect(um.past[0]).toBe(s0);
    expect(um.current).toBe(s1);
    expect(um.future).toEqual([]);
  });

  it('respects MAX_UNDO_LEVELS (100) -- push 105 states, past.length <= 100', () => {
    const s0 = makeState('s0');
    let um = createUndoManager(s0);
    for (let i = 1; i <= 105; i++) {
      um = pushState(um, makeState(`s${i}`));
    }
    expect(um.past.length).toBeLessThanOrEqual(100);
    expect(um.current.probleme).toBe('s105');
  });

  it('clears future when pushing new state', () => {
    const s0 = makeState('s0');
    const s1 = makeState('s1');
    const s2 = makeState('s2');
    let um = createUndoManager(s0);
    um = pushState(um, s1);
    um = pushState(um, s2);
    um = undo(um); // future now has s2
    expect(um.future).toHaveLength(1);

    const s3 = makeState('s3');
    um = pushState(um, s3);
    expect(um.future).toEqual([]);
  });
});

describe('undo', () => {
  it('moves current to future, pops from past', () => {
    const s0 = makeState('s0');
    const s1 = makeState('s1');
    let um = createUndoManager(s0);
    um = pushState(um, s1);
    um = undo(um);

    expect(um.current).toBe(s0);
    expect(um.past).toEqual([]);
    expect(um.future).toHaveLength(1);
    expect(um.future[0]).toBe(s1);
  });

  it('on empty past returns unchanged', () => {
    const s0 = makeState('s0');
    const um = createUndoManager(s0);
    const result = undo(um);
    expect(result).toBe(um);
  });
});

describe('redo', () => {
  it('moves current to past, pops from future', () => {
    const s0 = makeState('s0');
    const s1 = makeState('s1');
    let um = createUndoManager(s0);
    um = pushState(um, s1);
    um = undo(um);
    um = redo(um);

    expect(um.current).toBe(s1);
    expect(um.past).toHaveLength(1);
    expect(um.past[0]).toBe(s0);
    expect(um.future).toEqual([]);
  });

  it('on empty future returns unchanged', () => {
    const s0 = makeState('s0');
    const um = createUndoManager(s0);
    const result = redo(um);
    expect(result).toBe(um);
  });
});

describe('canUndo / canRedo', () => {
  it('canUndo returns false on fresh manager', () => {
    const um = createUndoManager(makeState(''));
    expect(canUndo(um)).toBe(false);
  });

  it('canUndo returns true after pushState', () => {
    let um = createUndoManager(makeState('s0'));
    um = pushState(um, makeState('s1'));
    expect(canUndo(um)).toBe(true);
  });

  it('canRedo returns false on fresh manager', () => {
    const um = createUndoManager(makeState(''));
    expect(canRedo(um)).toBe(false);
  });

  it('canRedo returns true after undo', () => {
    let um = createUndoManager(makeState('s0'));
    um = pushState(um, makeState('s1'));
    um = undo(um);
    expect(canRedo(um)).toBe(true);
  });
});

describe('undo/redo sequence', () => {
  it('push 3 states, undo 2, redo 1 -- verify state is correct', () => {
    const s0 = makeState('s0');
    const s1 = makeState('s1');
    const s2 = makeState('s2');
    const s3 = makeState('s3');

    let um = createUndoManager(s0);
    um = pushState(um, s1);
    um = pushState(um, s2);
    um = pushState(um, s3);

    expect(um.current.probleme).toBe('s3');

    um = undo(um); // current = s2
    expect(um.current.probleme).toBe('s2');

    um = undo(um); // current = s1
    expect(um.current.probleme).toBe('s1');

    um = redo(um); // current = s2
    expect(um.current.probleme).toBe('s2');

    expect(um.past).toHaveLength(2); // s0, s1
    expect(um.future).toHaveLength(1); // s3
  });
});
