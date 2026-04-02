import { get, set, del } from 'idb-keyval';
import type { UndoManager } from './types';
import type { SlotRegistry } from './slots';
import { createEmptyRegistry, createSlotMetadata } from './slots';

const REGISTRY_KEY = 'resomolo_registry';
const slotKey = (id: string) => `resomolo_slot_${id}`;
// Legacy keys for backward compat (migration)
const LEGACY_REGISTRY_KEY = 'modelivite_registry';
const LEGACY_SLOT_KEY = 'modelivite_slot'; // old single-slot key
const legacySlotKey = (id: string) => `modelivite_slot_${id}`;

export async function saveRegistry(registry: SlotRegistry): Promise<void> {
  await set(REGISTRY_KEY, JSON.stringify(registry));
}

export async function loadRegistry(): Promise<SlotRegistry> {
  try {
    const raw = await get<string>(REGISTRY_KEY) || await get<string>(LEGACY_REGISTRY_KEY);
    if (raw) return { ...createEmptyRegistry(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return createEmptyRegistry();
}

export async function saveSlotData(slotId: string, undoManager: UndoManager): Promise<void> {
  await set(slotKey(slotId), JSON.stringify({ version: 1, data: undoManager }));
}

export async function loadSlotData(slotId: string): Promise<UndoManager | null> {
  try {
    const raw = await get<string>(slotKey(slotId)) || await get<string>(legacySlotKey(slotId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data || parsed; // support versioned and legacy format
  } catch { return null; }
}

export async function deleteSlotData(slotId: string): Promise<void> {
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
