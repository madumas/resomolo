import { generateId } from './id';

export interface SlotMetadata {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly problemeSummary?: string;  // Truncated problem text for display in slot list
  readonly piecesSummary?: string;    // e.g. "3 barres · 2 jetons · 1 calcul"
}

export interface SlotRegistry {
  readonly slots: readonly SlotMetadata[];
  readonly activeSlotId: string | null;
  readonly nextNumber: number;
}

export const MAX_SLOTS = 50;

export function createEmptyRegistry(): SlotRegistry {
  return { slots: [], activeSlotId: null, nextNumber: 1 };
}

export function createSlotMetadata(name: string): SlotMetadata {
  return {
    id: generateId(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
