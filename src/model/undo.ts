import type { ModelisationState, UndoManager } from './types';
import { MAX_UNDO_LEVELS } from './types';

export function createUndoManager(initial: ModelisationState): UndoManager {
  return {
    past: [],
    current: initial,
    future: [],
  };
}

export function pushState(um: UndoManager, newState: ModelisationState): UndoManager {
  const past = [...um.past, um.current];
  if (past.length > MAX_UNDO_LEVELS) {
    past.shift();
  }
  return {
    past,
    current: newState,
    future: [],
  };
}

export function undo(um: UndoManager): UndoManager {
  if (um.past.length === 0) return um;
  const previous = um.past[um.past.length - 1];
  return {
    past: um.past.slice(0, -1),
    current: previous,
    future: [um.current, ...um.future],
  };
}

export function redo(um: UndoManager): UndoManager {
  if (um.future.length === 0) return um;
  const next = um.future[0];
  return {
    past: [...um.past, um.current],
    current: next,
    future: um.future.slice(1),
  };
}

export function canUndo(um: UndoManager): boolean {
  return um.past.length > 0;
}

export function canRedo(um: UndoManager): boolean {
  return um.future.length > 0;
}
