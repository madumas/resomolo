import { get, set, del } from 'idb-keyval';
import type { UndoManager } from './types';
import type { SlotRegistry } from './slots';
import { createEmptyRegistry, createSlotMetadata } from './slots';
import { migrateUndoManager } from './persistence';
import { STORAGE_VERSION, migrate, extractVersion, isFutureVersion } from './migrations';

const REGISTRY_KEY = 'resomolo_registry';
const slotKey = (id: string) => `resomolo_slot_${id}`;
// Legacy keys for backward compat (migration)
const LEGACY_REGISTRY_KEY = 'modelivite_registry';
const LEGACY_SLOT_KEY = 'modelivite_slot'; // old single-slot key
const legacySlotKey = (id: string) => `modelivite_slot_${id}`;

// localStorage mirror keys (fallback when IDB is unavailable/cleared)
const LS_REGISTRY_KEY = 'resomolo_ls_registry';
const lsSlotKey = (id: string) => `resomolo_ls_slot_${id}`;

function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded — best effort */ }
}

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export async function saveRegistry(registry: SlotRegistry): Promise<void> {
  const json = JSON.stringify(registry);
  lsSet(LS_REGISTRY_KEY, json);
  try {
    await set(REGISTRY_KEY, json);
  } catch (e) {
    console.warn('RésoMolo: registry save failed', e);
  }
}

export async function loadRegistry(): Promise<SlotRegistry> {
  try {
    const raw = await get<string>(REGISTRY_KEY) || await get<string>(LEGACY_REGISTRY_KEY);
    if (raw) return { ...createEmptyRegistry(), ...JSON.parse(raw) };
  } catch { /* IDB failed */ }
  // Fallback: localStorage mirror
  const lsRaw = lsGet(LS_REGISTRY_KEY);
  if (lsRaw) {
    try { return { ...createEmptyRegistry(), ...JSON.parse(lsRaw) }; } catch { /* ignore */ }
  }
  return createEmptyRegistry();
}

export async function saveSlotData(slotId: string, undoManager: UndoManager): Promise<void> {
  const json = JSON.stringify({ version: STORAGE_VERSION, data: undoManager });
  lsSet(lsSlotKey(slotId), json);
  try {
    await set(slotKey(slotId), json);
  } catch (e) {
    console.warn('RésoMolo: slot save failed', e);
  }
}

function parseSlotPayload(raw: string): UndoManager | null {
  try {
    const parsed = JSON.parse(raw);
    const version = extractVersion(parsed);
    if (isFutureVersion(version)) {
      console.warn(`RésoMolo: slot payload v${version} is newer than app v${STORAGE_VERSION} — ignoring`);
      return null;
    }
    const payload = (parsed && typeof parsed.version === 'number') ? parsed.data : parsed;
    if (!payload?.current?.pieces) return null;
    const migrated = migrate(version, STORAGE_VERSION, payload) as UndoManager;
    return migrateUndoManager(migrated) as UndoManager;
  } catch {
    return null;
  }
}

export async function loadSlotData(slotId: string): Promise<UndoManager | null> {
  try {
    const raw = await get<string>(slotKey(slotId)) || await get<string>(legacySlotKey(slotId));
    if (raw) {
      const um = parseSlotPayload(raw);
      if (um) return um;
    }
  } catch { /* IDB failed */ }
  // Fallback: localStorage mirror
  const lsRaw = lsGet(lsSlotKey(slotId));
  if (lsRaw) {
    const um = parseSlotPayload(lsRaw);
    if (um) return um;
  }
  return null;
}

export async function deleteSlotData(slotId: string): Promise<void> {
  lsRemove(lsSlotKey(slotId));
  await del(slotKey(slotId));
}

// Migration from legacy single-slot format
export async function migrateIfNeeded(): Promise<SlotRegistry> {
  const registry = await loadRegistry();
  if (registry.slots.length > 0) return registry; // already migrated

  // Check for legacy data
  try {
    const legacyRaw = await get<string>(LEGACY_SLOT_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      const undoManager = parsed.data || parsed;
      if (undoManager?.current?.pieces?.length > 0) {
        const slot = createSlotMetadata('Travail 1');
        const newRegistry: SlotRegistry = {
          slots: [slot],
          activeSlotId: slot.id,
          nextNumber: 2,
        };
        await saveSlotData(slot.id, undoManager);
        await saveRegistry(newRegistry);
        await del(LEGACY_SLOT_KEY);
        return newRegistry;
      }
    }
  } catch { /* ignore */ }

  return registry;
}
