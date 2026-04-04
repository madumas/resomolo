import { describe, test, expect, beforeEach } from 'vitest';
import { saveEmergency, loadEmergencySave, clearEmergencySave } from '../persistence';
import type { UndoManager } from '../types';

// Mock localStorage for Node test environment
const lsStore = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => lsStore.get(key) ?? null,
    setItem: (key: string, val: string) => lsStore.set(key, val),
    removeItem: (key: string) => lsStore.delete(key),
    clear: () => lsStore.clear(),
  },
  writable: true,
});

function makeUndoManager(pieces: any[] = []): UndoManager {
  return {
    past: [],
    current: {
      probleme: 'test',
      problemeReadOnly: false,
      problemeHighlights: [],
      referenceUnitMm: 60,
      pieces,
      availablePieces: null,
    },
    future: [],
  };
}

beforeEach(() => {
  lsStore.clear();
});

describe('emergency save — non-consuming behavior', () => {
  test('loadEmergencySave does NOT consume the save', () => {
    const um = makeUndoManager([{ id: 'p1', type: 'jeton', x: 0, y: 0, locked: false, couleur: 'bleu', parentId: null }]);
    saveEmergency(um);

    const first = loadEmergencySave();
    expect(first).not.toBeNull();
    expect(first!.current.pieces).toHaveLength(1);

    // Second read should still return data (not consumed)
    const second = loadEmergencySave();
    expect(second).not.toBeNull();
    expect(second!.current.pieces).toHaveLength(1);
  });

  test('clearEmergencySave removes the save', () => {
    const um = makeUndoManager();
    saveEmergency(um);
    expect(loadEmergencySave()).not.toBeNull();

    clearEmergencySave();
    expect(loadEmergencySave()).toBeNull();
  });

  test('loadEmergencySave returns null when nothing saved', () => {
    expect(loadEmergencySave()).toBeNull();
  });
});
