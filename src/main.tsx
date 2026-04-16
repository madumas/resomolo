import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { migrateIfNeeded, loadSlotData, saveSlotData, saveRegistry } from './model/slot-persistence';
import { loadSettings, loadEmergencySave, clearEmergencySave } from './model/persistence';
import { parseShareParam } from './engine/share';
import { createInitialUndoManager } from './model/state';
import { createSlotMetadata, createEmptyRegistry } from './model/slots';
import type { UndoManager } from './model/types';
import { initPwaUpdate } from './pwa-update';

initPwaUpdate();

// Parse URL share params synchronously (avant boot)
const shared = parseShareParam(window.location.search);
if (shared) {
  window.history.replaceState({}, '', window.location.pathname);
}

async function boot() {
  // 1. Registry + migration
  let registry = createEmptyRegistry();
  try {
    registry = await migrateIfNeeded();
  } catch { /* fallback to empty */ }

  // 2. Settings (en parallèle avec le chargement du slot)
  const settingsPromise = loadSettings();

  // 3. État initial
  let initialUndoManager: UndoManager = createInitialUndoManager();
  let problemZoneActive = true;

  if (shared) {
    // URL partagée — construire l'état directement
    initialUndoManager = {
      past: [],
      current: {
        probleme: shared.text,
        problemeReadOnly: true,
        problemeHighlights: [],
        referenceUnitMm: 60,
        pieces: shared.pieces || [],
        availablePieces: null,
      },
      future: [],
    };
    problemZoneActive = true;

    // Créer un slot pour persister le contenu partagé
    const slot = createSlotMetadata(`Travail ${registry.nextNumber}`);
    registry = {
      slots: [...registry.slots, slot],
      activeSlotId: slot.id,
      nextNumber: registry.nextNumber + 1,
    };
    await saveSlotData(slot.id, initialUndoManager);
    await saveRegistry(registry);
  } else if (registry.activeSlotId) {
    // Charger le slot actif + comparer avec emergency save
    const data = await loadSlotData(registry.activeSlotId);
    const emergency = loadEmergencySave();
    let finalData = data;
    if (emergency) {
      const slotMeta = registry.slots.find(s => s.id === registry.activeSlotId);
      const slotUpdatedAt = slotMeta?.updatedAt ?? 0;
      if (!data || emergency.savedAt > slotUpdatedAt) {
        finalData = emergency.um;
      }
    }
    if (finalData) {
      initialUndoManager = finalData;
      problemZoneActive = finalData.current.probleme.length > 0;
      clearEmergencySave();
    }
  }

  const initialSettings = await settingsPromise;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App
        initialRegistry={registry}
        initialUndoManager={initialUndoManager}
        initialSettings={initialSettings}
        initialProblemZoneActive={problemZoneActive}
      />
    </StrictMode>,
  );
}

boot();
