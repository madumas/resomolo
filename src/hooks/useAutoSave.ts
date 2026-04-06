import { useEffect, useRef } from 'react';
import type { UndoManager } from '../model/types';
import { AUTOSAVE_DEBOUNCE_MS } from '../model/types';
import { saveToStorage, saveEmergency } from '../model/persistence';
import { saveSlotData } from '../model/slot-persistence';

function buildPiecesSummary(pieces: UndoManager['current']['pieces']): string {
  const counts: Record<string, number> = {};
  for (const p of pieces) counts[p.type] = (counts[p.type] || 0) + 1;
  const labels: Record<string, string> = {
    jeton: 'jeton', barre: 'barre', boite: 'boîte', calcul: 'calcul',
    reponse: 'réponse', etiquette: 'étiquette', fleche: 'flèche',
  };
  return Object.entries(counts)
    .map(([type, n]) => `${n} ${labels[type] || type}${n > 1 ? 's' : ''}`)
    .join(' · ');
}

export function useAutoSave(
  undoManager: UndoManager,
  activeSlotId?: string | null,
  touchActiveSlot?: (summaries?: { problemeSummary?: string; piecesSummary?: string }) => Promise<void>,
  ready = true,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!ready) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (activeSlotId) {
        saveSlotData(activeSlotId, undoManager);
        if (touchActiveSlot) {
          const state = undoManager.current;
          const problemeSummary = state.probleme.length > 60
            ? state.probleme.slice(0, 60) + '…'
            : state.probleme;
          const piecesSummary = buildPiecesSummary(state.pieces);
          touchActiveSlot({ problemeSummary, piecesSummary });
        }
      } else {
        saveToStorage(undoManager);
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [undoManager, activeSlotId, touchActiveSlot, ready]);

  // I6: Save on beforeunload — slot key (async, best effort) + emergency (sync localStorage)
  useEffect(() => {
    if (!ready) return;
    const handler = () => {
      if (activeSlotId) {
        saveSlotData(activeSlotId, undoManager); // async best-effort
      }
      saveEmergency(undoManager);
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [undoManager, activeSlotId, ready]);
}
