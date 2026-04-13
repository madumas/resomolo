import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Roving tabindex for SVG piece navigation.
 * Only the focused piece has tabIndex=0; all others have tabIndex=-1.
 * Arrow keys cycle through pieces, Enter activates (select), Delete removes.
 */
export interface RovingTabindexResult {
  /** ID of the currently focused piece (for tabIndex assignment) */
  focusedId: string | null;
  /** Call when a piece receives focus via click — syncs roving state */
  onPieceFocus: (id: string) => void;
  /** Keyboard handler to attach to the SVG container */
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function useRovingTabindex(
  pieceIds: string[],
  selectedPieceId: string | null,
  callbacks: {
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onMovePiece: (id: string, dx: number, dy: number) => void;
  },
): RovingTabindexResult {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const pieceIdsRef = useRef(pieceIds);
  pieceIdsRef.current = pieceIds;

  // If focused piece is removed, reset focus
  useEffect(() => {
    if (focusedId && !pieceIds.includes(focusedId)) {
      setFocusedId(pieceIds.length > 0 ? pieceIds[0] : null);
    }
  }, [pieceIds, focusedId]);

  // Move DOM focus to the focused piece element (accessibility: screen readers)
  useEffect(() => {
    if (focusedId) {
      const el = document.querySelector(`[data-piece-id="${focusedId}"]`) as HTMLElement | null;
      el?.focus();
    }
  }, [focusedId]);

  const onPieceFocus = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const ids = pieceIdsRef.current;
    if (ids.length === 0) return;

    const currentIndex = focusedId ? ids.indexOf(focusedId) : -1;
    const GRID_STEP = 5; // mm per arrow key press

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        if (selectedPieceId && focusedId === selectedPieceId) {
          // Move selected piece
          callbacks.onMovePiece(selectedPieceId, e.key === 'ArrowRight' ? GRID_STEP : 0, e.key === 'ArrowDown' ? GRID_STEP : 0);
        } else {
          // Navigate to next piece
          const next = (currentIndex + 1) % ids.length;
          setFocusedId(ids[next]);
        }
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        if (selectedPieceId && focusedId === selectedPieceId) {
          callbacks.onMovePiece(selectedPieceId, e.key === 'ArrowLeft' ? -GRID_STEP : 0, e.key === 'ArrowUp' ? -GRID_STEP : 0);
        } else {
          const prev = currentIndex <= 0 ? ids.length - 1 : currentIndex - 1;
          setFocusedId(ids[prev]);
        }
        break;
      }
      case 'Home': {
        e.preventDefault();
        if (ids.length > 0) setFocusedId(ids[0]);
        break;
      }
      case 'End': {
        e.preventDefault();
        if (ids.length > 0) setFocusedId(ids[ids.length - 1]);
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (focusedId) {
          callbacks.onSelect(focusedId);
        }
        break;
      }
      case 'Delete':
      case 'Backspace': {
        e.preventDefault();
        if (focusedId) {
          callbacks.onDelete(focusedId);
        }
        break;
      }
      case 'Escape': {
        // Handled by Canvas already
        break;
      }
      case 'Tab': {
        // Let Tab move focus to next piece (roving)
        if (!e.shiftKey && currentIndex < ids.length - 1) {
          e.preventDefault();
          setFocusedId(ids[currentIndex + 1]);
        } else if (e.shiftKey && currentIndex > 0) {
          e.preventDefault();
          setFocusedId(ids[currentIndex - 1]);
        }
        // If at boundary, let Tab escape to next focusable element
        break;
      }
    }
  }, [focusedId, selectedPieceId, callbacks]);

  return { focusedId, onPieceFocus, onKeyDown };
}
