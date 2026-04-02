import { useState, useCallback, useRef } from 'react';
import type { UndoManager } from '../model/types';
import type { SlotRegistry } from '../model/slots';
import { createSlotMetadata, createEmptyRegistry, MAX_SLOTS } from '../model/slots';
import { saveRegistry, saveSlotData, loadSlotData, deleteSlotData } from '../model/slot-persistence';
import { createInitialUndoManager } from '../model/state';
import type { Action } from '../model/state';

interface UseSlotManagerOptions {
  undoManager: UndoManager;
  dispatch: (action: Action) => void;
}

export function useSlotManager({ undoManager, dispatch }: UseSlotManagerOptions) {
  const [registry, setRegistry] = useState<SlotRegistry>(createEmptyRegistry());

  // C1: Ref to always have latest undoManager for async operations
  const undoManagerRef = useRef(undoManager);
  undoManagerRef.current = undoManager;

  const initRegistry = useCallback(async (loaded: SlotRegistry) => {
    setRegistry(loaded);
  }, []);

  const switchSlot = useCallback(async (targetId: string): Promise<UndoManager> => {
    // Save current slot (C1: use ref for latest undoManager in async)
    setRegistry(prev => {
      if (prev.activeSlotId) {
        saveSlotData(prev.activeSlotId, undoManagerRef.current); // fire-and-forget
      }
      const newRegistry = { ...prev, activeSlotId: targetId };
      saveRegistry(newRegistry); // fire-and-forget
      return newRegistry;
    });
    // Load target
    const data = await loadSlotData(targetId);
    const loaded = data || createInitialUndoManager();
    dispatch({ type: 'RESTORE', undoManager: loaded });
    return loaded;
  }, [dispatch]);

  const createNewSlot = useCallback(async (name?: string) => {
    // C1: use ref for latest undoManager in async + I3: functional state updates
    const newUndoManager = createInitialUndoManager();
    let cancelled = false;
    setRegistry(prev => {
      if (prev.slots.length >= MAX_SLOTS) { cancelled = true; return prev; }
      // Save current slot first
      if (prev.activeSlotId) {
        saveSlotData(prev.activeSlotId, undoManagerRef.current); // fire-and-forget
      }
      const slotName = name || `Modélisation ${prev.nextNumber}`;
      const slot = createSlotMetadata(slotName);
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
  }, [dispatch]);

  const removeSlot = useCallback(async (slotId: string) => {
    await deleteSlotData(slotId);
    // I3: read registry via ref pattern — we need current value for async logic
    // Use a promise to coordinate state update with async loads
    let registrySnapshot: SlotRegistry | null = null;
    setRegistry(prev => { registrySnapshot = prev; return prev; }); // read snapshot
    const reg = registrySnapshot!;
    const remaining = reg.slots.filter(s => s.id !== slotId);

    let newRegistry: SlotRegistry;
    if (remaining.length === 0) {
      // Create a new blank slot
      const slot = createSlotMetadata(`Modélisation ${reg.nextNumber}`);
      const newUndoManager = createInitialUndoManager();
      await saveSlotData(slot.id, newUndoManager);
      newRegistry = { slots: [slot], activeSlotId: slot.id, nextNumber: reg.nextNumber + 1 };
      dispatch({ type: 'RESTORE', undoManager: newUndoManager });
    } else if (slotId === reg.activeSlotId) {
      // Switch to first remaining
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
    // I3: functional state update
    setRegistry(prev => {
      const newSlots = prev.slots.map(s =>
        s.id === slotId ? { ...s, name, updatedAt: Date.now() } : s
      );
      const newRegistry = { ...prev, slots: newSlots };
      saveRegistry(newRegistry); // fire-and-forget
      return newRegistry;
    });
  }, []);

  // Update timestamp + summaries on current slot (called by auto-save)
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

  // Ensure at least one slot exists + auto-create on first interaction
  const ensureSlot = useCallback(async () => {
    // I3: functional state update + C1: use ref for undoManager
    let slotId: string | null = null;
    setRegistry(prev => {
      if (prev.activeSlotId) { slotId = prev.activeSlotId; return prev; }
      const slot = createSlotMetadata(`Modélisation ${prev.nextNumber}`);
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
    initRegistry,
    switchSlot,
    createNewSlot,
    removeSlot,
    renameSlot,
    touchActiveSlot,
    ensureSlot,
  };
}
