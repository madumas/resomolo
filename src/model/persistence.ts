import { get, set, del, keys } from 'idb-keyval';
import type { UndoManager, Settings, ModelisationState } from './types';
import { DEFAULT_SETTINGS } from './types';

const STORAGE_KEY = 'resomolo_slot';
const SETTINGS_KEY = 'resomolo_settings';
const EMERGENCY_KEY = 'resomolo_emergency';
// Legacy keys for backward compat (migration reads these)
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
    localStorage.setItem(EMERGENCY_KEY, JSON.stringify({ version: STORAGE_VERSION, data: undoManager, savedAt: Date.now() }));
  } catch { /* quota exceeded — best effort */ }
}

export interface EmergencySave {
  um: UndoManager;
  savedAt: number;
}

/** Check emergency save from localStorage. Does NOT consume it — kept as IDB fallback. */
export function loadEmergencySave(): EmergencySave | null {
  try {
    const raw = localStorage.getItem(EMERGENCY_KEY) || localStorage.getItem(LEGACY_EMERGENCY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const um = extractUndoManager(parsed);
    if (!um) return null;
    return { um, savedAt: parsed.savedAt ?? 0 };
  } catch {
    return null;
  }
}

/** Clear emergency save (call after confirming IDB save succeeded). */
export function clearEmergencySave(): void {
  try {
    localStorage.removeItem(EMERGENCY_KEY);
    localStorage.removeItem(LEGACY_EMERGENCY_KEY);
  } catch { /* ignore */ }
}

/** Migrate pieces from older versions (add missing fields with defaults). */
function migratePieces(pieces: any[]): any[] {
  return pieces.map(p => {
    if (p.type === 'groupe') {
      return {
        ...p,
        type: 'boite',
        width: Math.max(25, (p.count || 3) * 6 + 10),
        height: 15,
        value: String(p.count || 3),
        couleur: p.couleur || 'bleu',
        label: p.label || '',
      };
    }
    if (p.type === 'boite' && p.value === undefined) {
      return { ...p, value: '', couleur: p.couleur || 'bleu' };
    }
    if (p.type === 'barre' && p.showFraction === undefined) {
      return { ...p, showFraction: false };
    }
    if (p.type === 'arbre' && !p.levels) {
      return { ...p, levels: [{ name: 'Niveau 1', options: ['A', 'B'] }, { name: 'Niveau 2', options: ['1', '2'] }] };
    }
    if (p.type === 'schema') {
      return {
        ...p,
        gabarit: p.gabarit || 'libre',
        totalLabel: p.totalLabel ?? '',
        totalValue: p.totalValue ?? null,
        bars: p.bars || [{ label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] }],
        referenceWidth: p.referenceWidth || 60,
      };
    }
    if (p.type === 'inconnue') {
      return { ...p, text: p.text ?? '?', attachedTo: p.attachedTo ?? null };
    }
    if (p.type === 'diagrammeBandes') {
      return {
        ...p,
        title: p.title ?? '',
        categories: p.categories ?? [{ label: 'A', value: 0, couleur: 'bleu' }],
        yAxisLabel: p.yAxisLabel ?? '',
        width: p.width ?? 120,
        height: p.height ?? 90,
      };
    }
    if (p.type === 'diagrammeLigne') {
      return {
        ...p,
        title: p.title ?? '',
        points: p.points ?? [{ label: 'A', value: 0 }],
        yAxisLabel: p.yAxisLabel ?? '',
        width: p.width ?? 120,
        height: p.height ?? 90,
      };
    }
    return p;
  });
}

export function migrateUndoManager(um: any): any {
  if (um?.current?.pieces) {
    um.current.pieces = migratePieces(um.current.pieces);
  }
  if (um?.past) {
    um.past = um.past.map((s: any) => ({ ...s, pieces: migratePieces(s.pieces || []) }));
  }
  if (um?.future) {
    um.future = um.future.map((s: any) => ({ ...s, pieces: migratePieces(s.pieces || []) }));
  }
  return um;
}

function extractUndoManager(parsed: any): UndoManager | null {
  if (parsed && typeof parsed.version === 'number') {
    const um = parsed.data;
    if (um && um.current && Array.isArray(um.current.pieces)) {
      return migrateUndoManager(um) as UndoManager;
    }
    return null;
  }
  // Legacy unversioned format (v0): direct UndoManager
  if (parsed && parsed.current && Array.isArray(parsed.current.pieces)) {
    return migrateUndoManager(parsed) as UndoManager;
  }
  return null;
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
    // Clear localStorage mirrors (resomolo_ls_*)
    const lsKeys = Object.keys(localStorage);
    for (const key of lsKeys) {
      if (key.startsWith('resomolo_ls_')) localStorage.removeItem(key);
    }
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
      pieces: migratePieces(data.pieces || []),
      availablePieces: data.availablePieces ?? null,
    };
  } catch {
    return null;
  }
}
