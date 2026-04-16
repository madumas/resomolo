import { useState, useCallback, useRef } from 'react';
import type { UndoManager } from '../model/types';
import type { SlotRegistry, SlotMetadata } from '../model/slots';
import { createSlotMetadata, MAX_SLOTS } from '../model/slots';
import { saveRegistry, saveSlotData, loadSlotData, deleteSlotData } from '../model/slot-persistence';
import { createInitialUndoManager } from '../model/state';
import type { Action } from '../model/state';

export const MAX_SLOT_NAME_LENGTH = 60;

/** Normalise un nom de slot : trim, réduction espaces multiples, troncature à 60 chars. */
export function normalizeSlotName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_SLOT_NAME_LENGTH);
}

/** Dédupe un nom contre la liste existante en ajoutant " (2)", " (3)" si nécessaire. */
export function dedupeSlotName(desired: string, existing: readonly SlotMetadata[], ignoreId?: string): string {
  const names = new Set(existing.filter(s => s.id !== ignoreId).map(s => s.name));
  if (!names.has(desired)) return desired;
  const base = desired.replace(/ \(\d+\)$/, '');
  for (let i = 2; i < 1000; i++) {
    const candidate = normalizeSlotName(`${base} (${i})`);
    if (!names.has(candidate)) return candidate;
  }
  return desired; // fallback silencieux
}

interface UseSlotManagerOptions {
  initialRegistry: SlotRegistry;
  undoManager: UndoManager;
  dispatch: (action: Action) => void;
}

export function useSlotManager({ initialRegistry, undoManager, dispatch }: UseSlotManagerOptions) {
  const [registry, setRegistry] = useState<SlotRegistry>(initialRegistry);
  const [switchingTargetId, setSwitchingTargetId] = useState<string | null>(null);

  // Refs to always have latest values for async operations
  const undoManagerRef = useRef(undoManager);
  undoManagerRef.current = undoManager;
  const registryRef = useRef(registry);
  registryRef.current = registry;

  const switchSlot = useCallback(async (targetId: string): Promise<UndoManager> => {
    // Feedback visuel : l'appelant peut lire switchingTargetId pour griser le slot cible
    setSwitchingTargetId(targetId);
    try {
      // Sauvegarder le slot courant AVANT de charger la cible — évite perte si l'onglet est
      // fermé entre-temps ou si le load échoue.
      const prev = registryRef.current;
      if (prev.activeSlotId && prev.activeSlotId !== targetId) {
        await saveSlotData(prev.activeSlotId, undoManagerRef.current);
      }
      const newRegistry = { ...prev, activeSlotId: targetId };
      setRegistry(newRegistry);
      await saveRegistry(newRegistry);
      const data = await loadSlotData(targetId);
      const loaded = data || createInitialUndoManager();
      dispatch({ type: 'RESTORE', undoManager: loaded });
      return loaded;
    } finally {
      setSwitchingTargetId(null);
    }
  }, [dispatch]);

  const createNewSlot = useCallback(async (name?: string) => {
    const newUndoManager = createInitialUndoManager();
    let cancelled = false;
    let createdId: string | null = null;
    setRegistry(prev => {
      if (prev.slots.length >= MAX_SLOTS) { cancelled = true; return prev; }
      if (prev.activeSlotId) {
        saveSlotData(prev.activeSlotId, undoManagerRef.current); // fire-and-forget
      }
      const desired = name ? normalizeSlotName(name) : `Travail ${prev.nextNumber}`;
      const slotName = dedupeSlotName(desired, prev.slots);
      const slot = createSlotMetadata(slotName);
      createdId = slot.id;
      saveSlotData(slot.id, newUndoManager); // fire-and-forget
      const newRegistry: SlotRegistry = {
        slots: [...prev.slots, slot],
        activeSlotId: slot.id,
        nextNumber: prev.nextNumber + 1,
      };
      saveRegistry(newRegistry); // fire-and-forget
      return newRegistry;
    });
    if (!cancelled) {
      dispatch({ type: 'RESTORE', undoManager: newUndoManager });
    }
    return createdId;
  }, [dispatch]);

  const removeSlot = useCallback(async (slotId: string) => {
    await deleteSlotData(slotId);
    const reg = registryRef.current;
    const remaining = reg.slots.filter(s => s.id !== slotId);

    let newRegistry: SlotRegistry;
    if (remaining.length === 0) {
      const slot = createSlotMetadata(`Travail ${reg.nextNumber}`);
      const newUndoManager = createInitialUndoManager();
      await saveSlotData(slot.id, newUndoManager);
      newRegistry = { slots: [slot], activeSlotId: slot.id, nextNumber: reg.nextNumber + 1 };
      dispatch({ type: 'RESTORE', undoManager: newUndoManager });
    } else if (slotId === reg.activeSlotId) {
      const target = remaining[0];
      const data = await loadSlotData(target.id);
      newRegistry = { ...reg, slots: remaining, activeSlotId: target.id };
      dispatch({ type: 'RESTORE', undoManager: data || createInitialUndoManager() });
    } else {
      newRegistry = { ...reg, slots: remaining };
    }

    setRegistry(newRegistry);
    await saveRegistry(newRegistry);
  }, [dispatch]);

  const renameSlot = useCallback(async (slotId: string, name: string) => {
    setRegistry(prev => {
      const desired = normalizeSlotName(name);
      const finalName = desired.length === 0
        ? prev.slots.find(s => s.id === slotId)?.name ?? 'Travail'
        : dedupeSlotName(desired, prev.slots, slotId);
      const newSlots = prev.slots.map(s =>
        s.id === slotId ? { ...s, name: finalName, updatedAt: Date.now() } : s
      );
      const newRegistry = { ...prev, slots: newSlots };
      saveRegistry(newRegistry);
      return newRegistry;
    });
  }, []);

  const touchActiveSlot = useCallback(async (summaries?: { problemeSummary?: string; piecesSummary?: string }) => {
    setRegistry(prev => {
      if (!prev.activeSlotId) return prev;
      const newSlots = prev.slots.map(s =>
        s.id === prev.activeSlotId ? { ...s, updatedAt: Date.now(), ...summaries } : s
      );
      const newRegistry = { ...prev, slots: newSlots };
      saveRegistry(newRegistry);
      return newRegistry;
    });
  }, []);

  const ensureSlot = useCallback(async () => {
    let slotId: string | null = null;
    setRegistry(prev => {
      if (prev.activeSlotId) { slotId = prev.activeSlotId; return prev; }
      const slot = createSlotMetadata(`Travail ${prev.nextNumber}`);
      slotId = slot.id;
      saveSlotData(slot.id, undoManagerRef.current); // fire-and-forget
      const newRegistry: SlotRegistry = {
        slots: [...prev.slots, slot],
        activeSlotId: slot.id,
        nextNumber: prev.nextNumber + 1,
      };
      saveRegistry(newRegistry); // fire-and-forget
      return newRegistry;
    });
    return slotId!;
  }, []);

  return {
    registry,
    activeSlotId: registry.activeSlotId,
    isSwitching: switchingTargetId !== null,
    switchingTargetId,
    switchSlot,
    createNewSlot,
    removeSlot,
    renameSlot,
    touchActiveSlot,
    ensureSlot,
  };
}
