import { describe, test, expect, beforeEach, vi } from 'vitest';
import { saveRegistry, loadRegistry, saveSlotData, loadSlotData, deleteSlotData } from '../slot-persistence';
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

// Mock idb-keyval — simulate IDB being available or failing
const idbStore = new Map<string, string>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbStore.get(key) ?? undefined),
  set: vi.fn(async (key: string, val: string) => { idbStore.set(key, val); }),
  del: vi.fn(async (key: string) => { idbStore.delete(key); }),
  keys: vi.fn(async () => [...idbStore.keys()]),
}));

function makeUndoManager(pieces: any[] = []): UndoManager {
  return {
    past: [],
    current: {
      probleme: '',
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
  idbStore.clear();
  lsStore.clear();
});

describe('slot-persistence localStorage fallback', () => {
  test('saveRegistry writes to both IDB and localStorage', async () => {
    const registry = { slots: [{ id: 's1', name: 'Test', createdAt: 1, updatedAt: 1 }], activeSlotId: 's1', nextNumber: 2 };
    await saveRegistry(registry);

    expect(idbStore.has('resomolo_registry')).toBe(true);
    expect(localStorage.getItem('resomolo_ls_registry')).not.toBeNull();
  });

  test('loadRegistry falls back to localStorage when IDB is empty', async () => {
    const registry = { slots: [{ id: 's1', name: 'Test', createdAt: 1, updatedAt: 1 }], activeSlotId: 's1', nextNumber: 2 };
    // Write only to localStorage (simulate IDB cleared)
    localStorage.setItem('resomolo_ls_registry', JSON.stringify(registry));

    const loaded = await loadRegistry();
    expect(loaded.activeSlotId).toBe('s1');
    expect(loaded.slots).toHaveLength(1);
  });

  test('loadRegistry returns empty when both IDB and localStorage are empty', async () => {
    const loaded = await loadRegistry();
    expect(loaded.slots).toHaveLength(0);
    expect(loaded.activeSlotId).toBeNull();
  });

  test('saveSlotData writes to both IDB and localStorage', async () => {
    const um = makeUndoManager([{ id: 'p1', type: 'jeton', x: 0, y: 0, locked: false, couleur: 'bleu', parentId: null }]);
    await saveSlotData('slot-1', um);

    expect(idbStore.has('resomolo_slot_slot-1')).toBe(true);
    expect(localStorage.getItem('resomolo_ls_slot_slot-1')).not.toBeNull();
  });

  test('loadSlotData falls back to localStorage when IDB is empty', async () => {
    const um = makeUndoManager([{ id: 'p1', type: 'jeton', x: 0, y: 0, locked: false, couleur: 'bleu', parentId: null }]);
    // Write only to localStorage
    localStorage.setItem('resomolo_ls_slot_slot-1', JSON.stringify({ version: 1, data: um }));

    const loaded = await loadSlotData('slot-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.current.pieces).toHaveLength(1);
  });

  test('loadSlotData returns null when both are empty', async () => {
    const loaded = await loadSlotData('nonexistent');
    expect(loaded).toBeNull();
  });

  test('deleteSlotData removes from both IDB and localStorage', async () => {
    const um = makeUndoManager();
    await saveSlotData('slot-1', um);
    expect(localStorage.getItem('resomolo_ls_slot_slot-1')).not.toBeNull();

    await deleteSlotData('slot-1');
    expect(idbStore.has('resomolo_slot_slot-1')).toBe(false);
    expect(localStorage.getItem('resomolo_ls_slot_slot-1')).toBeNull();
  });

  test('loadRegistry prefers IDB over localStorage', async () => {
    const idbRegistry = { slots: [{ id: 'idb', name: 'IDB', createdAt: 1, updatedAt: 1 }], activeSlotId: 'idb', nextNumber: 2 };
    const lsRegistry = { slots: [{ id: 'ls', name: 'LS', createdAt: 1, updatedAt: 1 }], activeSlotId: 'ls', nextNumber: 2 };
    idbStore.set('resomolo_registry', JSON.stringify(idbRegistry));
    localStorage.setItem('resomolo_ls_registry', JSON.stringify(lsRegistry));

    const loaded = await loadRegistry();
    expect(loaded.activeSlotId).toBe('idb');
  });
});
