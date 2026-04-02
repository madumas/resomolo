import { get, set, del, keys } from 'idb-keyval';
import type { UndoManager, Settings, ModelisationState } from './types';
import { DEFAULT_SETTINGS } from './types';

const STORAGE_KEY = 'resomolo_slot';
const SETTINGS_KEY = 'resomolo_settings';
const EMERGENCY_KEY = 'resomolo_emergency';
// Legacy keys for backward compat (migration reads these)
const LEGACY_STORAGE_KEY = 'modelivite_slot';
const LEGACY_SETTINGS_KEY = 'modelivite_settings';
const LEGACY_EMERGENCY_KEY = 'modelivite_emergency';
const STORAGE_VERSION = 1;

export async function saveToStorage(undoManager: UndoManager): Promise<void> {
  try {
    await set(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, data: undoManager }));
  } catch (e) {
    console.warn('RésoMolo: save failed', e);
  }
}

/** Synchronous emergency save via localStorage (for beforeunload). */
export function saveEmergency(undoManager: UndoManager): void {
  try {
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify({ version: STORAGE_VERSION, data: undoManager }));
  } catch { /* quota exceeded — best effort */ }
}

/** Check and consume emergency save from localStorage. */
export function loadEmergencySave(): UndoManager | null {
  try {
    // Try new key first, then legacy
    const raw = localStorage.getItem(EMERGENCY_KEY) || localStorage.getItem(LEGACY_EMERGENCY_KEY);
    if (!raw) return null;
    localStorage.removeItem(EMERGENCY_KEY);
    localStorage.removeItem(LEGACY_EMERGENCY_KEY);
    return parseStoredData(raw);
  } catch {
    return null;
  }
}

function parseStoredData(raw: string): UndoManager | null {
  const parsed = JSON.parse(raw);
  // Versioned format: { version, data }
  if (parsed && typeof parsed.version === 'number') {
    const um = parsed.data;
    if (um && um.current && Array.isArray(um.current.pieces)) {
      return um as UndoManager;
    }
    return null;
  }
  // Legacy unversioned format (v0): direct UndoManager
  if (parsed && parsed.current && Array.isArray(parsed.current.pieces)) {
    return parsed as UndoManager;
  }
  return null;
}

export async function loadFromStorage(): Promise<UndoManager | null> {
  try {
    // Check emergency save first (from last beforeunload)
    const emergency = loadEmergencySave();
    if (emergency) return emergency;
    // Try new key first, then legacy
    const raw = await get<string>(STORAGE_KEY) || await get<string>(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return parseStoredData(raw);
  } catch (e) {
    console.warn('RésoMolo: load failed', e);
    return null;
  }
}

export async function clearAllStorage(): Promise<void> {
  try {
    // Delete all resomolo_ and legacy modelivite_ IndexedDB keys
    const allKeys = await keys();
    for (const key of allKeys) {
      if (typeof key === 'string' && (key.startsWith('resomolo_') || key.startsWith('modelivite_'))) {
        await del(key);
      }
    }
    localStorage.removeItem(EMERGENCY_KEY);
    localStorage.removeItem(LEGACY_EMERGENCY_KEY);
  } catch (e) {
    console.warn('RésoMolo: clearAllStorage failed', e);
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const json = JSON.stringify(settings);
  // Sync localStorage fallback — survives background throttling / tab kill
  try { localStorage.setItem(SETTINGS_KEY, json); } catch {}
  try {
    await set(SETTINGS_KEY, json);
  } catch (e) {
    console.warn('RésoMolo: settings save failed', e);
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    // Try IndexedDB first, then localStorage fallback
    let raw = await get<string>(SETTINGS_KEY) || await get<string>(LEGACY_SETTINGS_KEY);
    if (!raw) {
      try { raw = localStorage.getItem(SETTINGS_KEY) ?? undefined; } catch {}
    }
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('RésoMolo: settings load failed', e);
    return DEFAULT_SETTINGS;
  }
}

// === File export/import (.resomolo) ===

export function exportModelisation(state: ModelisationState, name = 'modelisation'): void {
  const data = {
    version: 1,
    name,
    probleme: state.probleme,
    problemeReadOnly: state.problemeReadOnly,
    problemeHighlights: state.problemeHighlights,
    referenceUnitMm: state.referenceUnitMm,
    pieces: state.pieces,
    availablePieces: state.availablePieces,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.resomolo`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importModelisation(file: File): Promise<ModelisationState | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.version || !Array.isArray(data.pieces)) return null;
    return {
      probleme: data.probleme || '',
      problemeReadOnly: data.problemeReadOnly ?? false,
      problemeHighlights: data.problemeHighlights || [],
      referenceUnitMm: data.referenceUnitMm || 60,
      pieces: data.pieces || [],
      availablePieces: data.availablePieces ?? null,
    };
  } catch {
    return null;
  }
}
