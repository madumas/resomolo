import type { ModelisationState, Piece, Highlight, UndoManager, ToolType, Jeton, Boite, Etiquette, Inconnue, Reponse } from './types';
import { REFERENCE_UNIT_MM, BAR_HEIGHT_MM, CANVAS_WIDTH_MM } from './types';
import { generateId } from './id';
import { createUndoManager, pushState, undo as undoFn, redo as redoFn } from './undo';

// === Initial state ===

export function createInitialState(probleme = '', readOnly = false): ModelisationState {
  return {
    probleme,
    problemeReadOnly: readOnly,
    problemeHighlights: [],
    referenceUnitMm: REFERENCE_UNIT_MM,
    pieces: [],
    availablePieces: null,
  };
}

export function createInitialUndoManager(probleme = '', readOnly = false): UndoManager {
  return createUndoManager(createInitialState(probleme, readOnly));
}

// === Actions ===

export type Action =
  | { type: 'PLACE_PIECE'; piece: Piece }
  | { type: 'PLACE_PIECES'; pieces: Piece[] } // batch (e.g. multiple jetons)
  | { type: 'MOVE_PIECE'; id: string; x: number; y: number }
  | { type: 'MOVE_PIECE_LIVE'; id: string; x: number; y: number }
  | { type: 'EDIT_PIECE'; id: string; changes: Record<string, unknown> }
  | { type: 'DELETE_PIECE'; id: string }
  | { type: 'HIGHLIGHT_ADD'; highlight: Highlight }
  | { type: 'HIGHLIGHT_REMOVE'; start: number; end: number }
  | { type: 'SET_PROBLEM'; text: string; readOnly: boolean }
  | { type: 'SET_PROBLEM_AND_CLEAR'; text: string; readOnly: boolean }
  | { type: 'CLEAR_PIECES' } // recommencer
  | { type: 'ARRANGE_PIECES'; moves: Array<{ id: string; x: number; y: number }> }
  | { type: 'UNGROUP_BARRES'; groupId: string }
  | { type: 'REPARTIR_JETONS'; jetonIds: string[]; groupCount: number; startX: number; startY: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESTORE'; undoManager: UndoManager };

// === App state (wraps undo manager + UI state) ===

export interface AppState {
  undoManager: UndoManager;
  activeTool: ToolType;
  selectedPieceId: string | null;
  editingPieceId: string | null;
  problemZoneExpanded: boolean;
}

export function createInitialAppState(probleme = '', readOnly = false): AppState {
  return {
    undoManager: createInitialUndoManager(probleme, readOnly),
    activeTool: null,
    selectedPieceId: null,
    editingPieceId: null,
    problemZoneExpanded: true,
  };
}

// === Helpers ===

/** Compute piece center for the reducer (simplified — no external deps). */
function getReponseWidthSimple(piece: Reponse): number {
  if (piece.template) {
    const parts = piece.template.split('___');
    const blanks = piece.text ? piece.text.split('|') : [];
    let tpl = '';
    for (let i = 0; i < parts.length; i++) {
      tpl += parts[i];
      if (i < parts.length - 1) tpl += blanks[i] || '____';
    }
    return Math.max(120, tpl.length * 3.2 + 20);
  }
  return Math.max(100, piece.text.length * 4 + 20);
}

function getPieceCenterSimple(piece: Piece, referenceUnitMm: number): { x: number; y: number } {
  switch (piece.type) {
    case 'jeton': return { x: piece.x, y: piece.y };
    case 'barre': return { x: piece.x + (piece.sizeMultiplier * referenceUnitMm) / 2, y: piece.y + BAR_HEIGHT_MM / 2 };
    case 'boite': return { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 };
    case 'calcul': return { x: piece.x + Math.max(80, piece.expression.length * 5 + 10) / 2, y: piece.y + 7 };
    case 'reponse': return { x: piece.x + getReponseWidthSimple(piece) / 2, y: piece.y + 11 };
    case 'etiquette': return { x: piece.x + Math.max(30, piece.text.length * 4 + 8) / 2, y: piece.y - 2 };
    case 'droiteNumerique': return { x: piece.x + (piece as any).width / 2, y: piece.y };
    case 'tableau': return { x: piece.x + (piece as any).cols * 12 / 2, y: piece.y + (piece as any).rows * 10 / 2 };
    case 'arbre': {
      // Simplified: estimate width from leaf count product
      const levels = (piece as any).levels || [];
      const leafCount = levels.reduce((acc: number, l: any) => acc * Math.max(1, (l.options || []).length), 1);
      const w = Math.max(60, leafCount * 28);
      const h = Math.max(12, levels.length * 30);
      return { x: piece.x + w / 2, y: piece.y + h / 2 };
    }
    case 'schema': {
      const bars = (piece as any).bars || [];
      const maxSm = bars.reduce((m: number, b: any) => Math.max(m, b.sizeMultiplier || 1), 1);
      const w = maxSm * referenceUnitMm;
      const h = Math.max(15, bars.length * 23);
      return { x: piece.x + w / 2, y: piece.y + h / 2 };
    }
    case 'inconnue': return { x: piece.x, y: piece.y }; // center-origin like jeton
    case 'diagrammeBandes':
    case 'diagrammeLigne':
      return { x: piece.x + ((piece as any).width || 120) / 2, y: piece.y + ((piece as any).height || 90) / 2 };
    default: return { x: piece.x, y: piece.y };
  }
}

/** Auto-resize boîtes to fit their child jetons. */
function autoResizeBoite(state: ModelisationState): ModelisationState {
  const boites = state.pieces.filter((p): p is Boite => p.type === 'boite');
  let pieces = state.pieces;
  let changed = false;

  for (const boite of boites) {
    const children = pieces.filter(p => p.type === 'jeton' && p.parentId === boite.id);
    if (children.length === 0) continue;

    const padding = 10; // mm
    const childMinX = Math.min(...children.map(c => c.x)) - padding;
    const childMaxX = Math.max(...children.map(c => c.x)) + padding;
    const childMinY = Math.min(...children.map(c => c.y)) - padding;
    const childMaxY = Math.max(...children.map(c => c.y)) + padding;

    // Keep the boîte position stable — only expand if children overflow by more than tolerance
    const DEFAULT_WIDTH = 60, DEFAULT_HEIGHT = 40;
    const TOLERANCE = 5; // mm — allow children to be slightly outside before resizing
    const newX = childMinX < boite.x - TOLERANCE ? childMinX : boite.x;
    const newY = childMinY < boite.y - TOLERANCE ? childMinY : boite.y;
    const boiteRight = boite.x + boite.width;
    const boiteBottom = boite.y + boite.height;
    const newRight = childMaxX > boiteRight + TOLERANCE ? childMaxX : boiteRight;
    const newBottom = childMaxY > boiteBottom + TOLERANCE ? childMaxY : boiteBottom;
    const newWidth = Math.max(DEFAULT_WIDTH, newRight - newX);
    const newHeight = Math.max(DEFAULT_HEIGHT, newBottom - newY);

    if (newWidth !== boite.width || newHeight !== boite.height || newX !== boite.x || newY !== boite.y) {
      changed = true;
      pieces = pieces.map(p =>
        p.id === boite.id
          ? { ...p, x: newX, y: newY, width: newWidth, height: newHeight } as Piece
          : p
      );
    }
  }

  return changed ? { ...state, pieces } : state;
}

/** Collect all sizeMultipliers from free barres AND schema bars. */
function getAllBarMultipliers(pieces: Piece[]): number[] {
  const multipliers: number[] = [];
  for (const p of pieces) {
    if (p.type === 'barre') multipliers.push((p as any).sizeMultiplier);
    if (p.type === 'schema') {
      for (const bar of ((p as any).bars || [])) {
        multipliers.push(bar.sizeMultiplier || 1);
      }
    }
  }
  return multipliers;
}

/** Auto-scale referenceUnitMm so that the widest barre/schema bar fits in the canvas. */
function autoScaleReference(state: ModelisationState): ModelisationState {
  const multipliers = getAllBarMultipliers(state.pieces);
  if (multipliers.length === 0) return state;
  const maxMultiplier = Math.max(...multipliers);
  const maxWidth = 470; // CANVAS_WIDTH_MM (500) - 2 * MARGIN (15)
  if (maxMultiplier * state.referenceUnitMm > maxWidth) {
    // C3: Floor of 10mm to prevent referenceUnitMm = 0
    return { ...state, referenceUnitMm: Math.max(10, Math.floor(maxWidth / maxMultiplier)) };
  }
  return state;
}

/** C3: Restore referenceUnitMm after deleting barres/schema (may allow larger unit again). */
function autoRestoreReference(state: ModelisationState): ModelisationState {
  const multipliers = getAllBarMultipliers(state.pieces);
  if (multipliers.length === 0) return { ...state, referenceUnitMm: REFERENCE_UNIT_MM };
  const maxMultiplier = Math.max(...multipliers);
  const maxWidth = 470;
  const ideal = Math.min(REFERENCE_UNIT_MM, Math.floor(maxWidth / maxMultiplier));
  return { ...state, referenceUnitMm: Math.max(10, ideal) };
}

// === Reducer ===

function reduceModelisation(state: ModelisationState, action: Action): ModelisationState | null {
  switch (action.type) {
    case 'PLACE_PIECE': {
      let newState = { ...state, pieces: [...state.pieces, action.piece] };
      if (action.piece.type === 'jeton' && action.piece.parentId) {
        newState = autoResizeBoite(newState);
      }
      if (action.piece.type === 'barre' || action.piece.type === 'schema') {
        newState = autoScaleReference(newState);
      }
      return newState;
    }

    case 'PLACE_PIECES': {
      const newState = { ...state, pieces: [...state.pieces, ...action.pieces] };
      const hasParentedJeton = action.pieces.some(p => p.type === 'jeton' && p.parentId);
      return hasParentedJeton ? autoResizeBoite(newState) : newState;
    }

    case 'MOVE_PIECE':
    case 'MOVE_PIECE_LIVE': {
      const movedPiece = state.pieces.find(p => p.id === action.id);
      if (!movedPiece) return state;

      const dx = action.x - movedPiece.x;
      const dy = action.y - movedPiece.y;

      // Move the piece + move attached children (étiquettes, jetons in boîte)
      let pieces = state.pieces.map(p => {
        if (p.id === action.id) return { ...p, x: action.x, y: action.y };
        // Étiquettes follow their parent
        if (p.type === 'etiquette' && (p as Etiquette).attachedTo === action.id) {
          return { ...p, x: p.x + dx, y: p.y + dy };
        }
        // Inconnues follow their parent
        if (p.type === 'inconnue' && (p as Inconnue).attachedTo === action.id) {
          return { ...p, x: p.x + dx, y: p.y + dy };
        }
        // Jetons follow their parent boîte
        if (p.type === 'jeton' && (p as Jeton).parentId === action.id && movedPiece.type === 'boite') {
          return { ...p, x: p.x + dx, y: p.y + dy };
        }
        return p;
      });

      // MOVE_PIECE (final, not live): detach inconnue if moved far from parent
      if (action.type === 'MOVE_PIECE' && movedPiece.type === 'inconnue' && (movedPiece as Inconnue).attachedTo) {
        const parent = pieces.find(p => p.id === (movedPiece as Inconnue).attachedTo);
        if (parent) {
          const center = getPieceCenterSimple(parent, state.referenceUnitMm);
          const dist = Math.hypot(action.x - center.x, action.y - center.y);
          if (dist > 15) {
            pieces = pieces.map(p =>
              p.id === movedPiece.id ? { ...p, attachedTo: null } as Piece : p
            );
          }
        }
      }

      // MOVE_PIECE (final, not live): detach étiquette if moved far from parent
      if (action.type === 'MOVE_PIECE' && movedPiece.type === 'etiquette' && (movedPiece as Etiquette).attachedTo) {
        const parent = pieces.find(p => p.id === (movedPiece as Etiquette).attachedTo);
        if (parent) {
          const center = getPieceCenterSimple(parent, state.referenceUnitMm);
          const dist = Math.hypot(action.x - center.x, action.y - center.y);
          if (dist > 15) {
            pieces = pieces.map(p =>
              p.id === movedPiece.id ? { ...p, attachedTo: null } as Piece : p
            );
          }
        }
      }

      // Update jeton parentId based on boîte containment (both live and final)
      if ((action.type === 'MOVE_PIECE' || action.type === 'MOVE_PIECE_LIVE') && movedPiece.type === 'jeton') {
        const currentParentId = (movedPiece as Jeton).parentId;
        // If jeton was in a boîte and moved, detach it first (user is pulling it out)
        // Then check if it landed in a (different) boîte
        const landedInBoite = pieces.find(p =>
          p.type === 'boite' && p.id !== action.id && p.id !== currentParentId &&
          action.x >= p.x && action.x <= p.x + (p as Boite).width &&
          action.y >= p.y && action.y <= p.y + (p as Boite).height
        );
        // If moved outside current parent boîte, detach
        let newParentId: string | null = currentParentId;
        if (currentParentId) {
          const parentBoite = pieces.find(p => p.id === currentParentId) as Boite | undefined;
          if (parentBoite) {
            const inside = action.x >= parentBoite.x && action.x <= parentBoite.x + parentBoite.width &&
                           action.y >= parentBoite.y && action.y <= parentBoite.y + parentBoite.height;
            if (!inside) newParentId = null; // detach — jeton pulled out
          }
        }
        // If landed in a new boîte, attach to it
        if (landedInBoite) newParentId = landedInBoite.id;
        if (newParentId !== currentParentId) {
          pieces = pieces.map(p =>
            p.id === action.id ? { ...p, parentId: newParentId } as Piece : p
          );
        }
      }

      let newState = { ...state, pieces };

      // Auto-resize boîtes only on final move (not during live drag — prevents
      // feedback loop where boîte grows to follow jeton being pulled out)
      if (action.type === 'MOVE_PIECE' && movedPiece.type === 'jeton') {
        newState = autoResizeBoite(newState);
      }

      return newState;
    }

    case 'EDIT_PIECE': {
      // I5: Guard — prevent overwriting type and id via changes
      const { type: _t, id: _i, ...safeChanges } = action.changes as any;
      let newState = {
        ...state,
        pieces: state.pieces.map(p =>
          p.id === action.id ? { ...p, ...safeChanges } as Piece : p
        ),
      };
      if ('sizeMultiplier' in safeChanges || 'bars' in safeChanges) {
        newState = autoScaleReference(newState);
      }
      return newState;
    }

    case 'DELETE_PIECE': {
      // Cascade: also delete attached fleches and etiquettes
      const deletedId = action.id;
      const filteredState = {
        ...state,
        pieces: state.pieces.filter(p => {
          if (p.id === deletedId) return false;
          if (p.type === 'fleche' && (p.fromId === deletedId || p.toId === deletedId)) return false;
          if (p.type === 'etiquette' && p.attachedTo === deletedId) return false;
          if (p.type === 'inconnue' && (p as Inconnue).attachedTo === deletedId) return false;
          if (p.type === 'jeton' && p.parentId === deletedId) return false;
          return true;
        }),
      };
      // C3: Recalculate reference unit after deletion (may allow restoration)
      return autoRestoreReference(filteredState);
    }

    case 'HIGHLIGHT_ADD':
      return {
        ...state,
        problemeHighlights: [...state.problemeHighlights, action.highlight],
      };

    case 'HIGHLIGHT_REMOVE':
      return {
        ...state,
        problemeHighlights: state.problemeHighlights.filter(
          h => !(h.start === action.start && h.end === action.end)
        ),
      };

    case 'SET_PROBLEM':
      return {
        ...state,
        probleme: action.text,
        problemeReadOnly: action.readOnly,
        problemeHighlights: [],
      };

    case 'SET_PROBLEM_AND_CLEAR':
      return {
        ...state,
        probleme: action.text,
        problemeReadOnly: action.readOnly,
        problemeHighlights: [],
        pieces: [],
      };

    case 'CLEAR_PIECES':
      return {
        ...state,
        pieces: [],
      };

    // I1: Atomic ungroup operation (replaces N individual EDIT_PIECE dispatches)
    case 'UNGROUP_BARRES':
      return {
        ...state,
        pieces: state.pieces.map(p =>
          p.type === 'barre' && (p as any).groupId === action.groupId
            ? { ...p, groupId: null, groupLabel: null } as Piece
            : p
        ),
      };

    case 'REPARTIR_JETONS': {
      const { jetonIds, groupCount, startX: rawStartX, startY } = action;
      if (jetonIds.length === 0 || groupCount < 2) return state;

      const perGroup = Math.floor(jetonIds.length / groupCount);
      const remainder = jetonIds.length % groupCount;
      const perRow = Math.min(perGroup, 5);
      const rows = perGroup > 0 ? Math.ceil(perGroup / perRow) : 1;
      const boiteW = Math.max(60, perRow * 12 + 16);
      const boiteH = Math.max(40, rows * 12 + 20);
      const gap = 10;
      const maxRowWidth = CANVAS_WIDTH_MM - 30;
      // Clamp startX so at least one boîte fits
      const startX = Math.min(rawStartX, maxRowWidth - boiteW);

      // Create K boîtes
      const newBoites: Piece[] = [];
      for (let i = 0; i < groupCount; i++) {
        let bx = startX + i * (boiteW + gap);
        let by = startY;
        // Wrap to next row if exceeds canvas
        if (bx + boiteW > maxRowWidth) {
          const perLine = Math.floor((maxRowWidth - startX) / (boiteW + gap));
          const row = Math.floor(i / Math.max(1, perLine));
          const col = i % Math.max(1, perLine);
          bx = startX + col * (boiteW + gap);
          by = startY + row * (boiteH + gap);
        }
        newBoites.push({
          id: generateId(),
          type: 'boite',
          x: bx, y: by,
          locked: false,
          width: boiteW, height: boiteH,
          label: `Groupe ${i + 1}`, value: '',
          couleur: 'bleu' as const,
        } as Boite);
      }

      // Distribute jetons into boîtes
      let pieces = [...state.pieces];
      let assigned = 0;
      for (let gi = 0; gi < groupCount; gi++) {
        const boite = newBoites[gi] as Boite;
        for (let ji = 0; ji < perGroup; ji++) {
          const idx = pieces.findIndex(p => p.id === jetonIds[assigned]);
          if (idx >= 0) {
            const col = ji % perRow;
            const row = Math.floor(ji / perRow);
            pieces[idx] = {
              ...pieces[idx],
              x: boite.x + 8 + col * 12,
              y: boite.y + 16 + row * 12,
              parentId: boite.id,
            } as Piece;
          }
          assigned++;
        }
      }

      // Remainder jetons — place below last boîte, free (avoids horizontal overflow)
      const lastBoite = newBoites[newBoites.length - 1] as Boite;
      for (let ri = 0; ri < remainder; ri++) {
        const idx = pieces.findIndex(p => p.id === jetonIds[assigned]);
        if (idx >= 0) {
          pieces[idx] = {
            ...pieces[idx],
            x: lastBoite.x + ri * 10,
            y: lastBoite.y + lastBoite.height + gap,
            parentId: null,
          } as Piece;
        }
        assigned++;
      }

      return autoResizeBoite({ ...state, pieces: [...pieces, ...newBoites] });
    }

    case 'ARRANGE_PIECES':
      return {
        ...state,
        pieces: state.pieces.map(p => {
          const move = action.moves.find(m => m.id === p.id);
          return move ? { ...p, x: move.x, y: move.y } : p;
        }),
      };

    default:
      return null; // not a modelisation action
  }
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UNDO':
      return {
        ...state,
        undoManager: undoFn(state.undoManager),
        selectedPieceId: null,
        editingPieceId: null,
      };

    case 'REDO':
      return {
        ...state,
        undoManager: redoFn(state.undoManager),
        selectedPieceId: null,
        editingPieceId: null,
      };

    case 'RESTORE':
      return {
        ...state,
        undoManager: action.undoManager,
        selectedPieceId: null,
        editingPieceId: null,
      };

    case 'MOVE_PIECE_LIVE': {
      // Live position update during drag — no undo push
      const liveModel = reduceModelisation(state.undoManager.current, action);
      if (!liveModel) return state;
      return { ...state, undoManager: { ...state.undoManager, current: liveModel } };
    }

    default: {
      const newModelState = reduceModelisation(state.undoManager.current, action);
      if (newModelState === null) return state;

      // Auto-expand problem zone when Reponse is placed
      let problemZoneExpanded = state.problemZoneExpanded;
      if (action.type === 'PLACE_PIECE' && action.piece.type === 'reponse') {
        problemZoneExpanded = true;
      }

      return {
        ...state,
        undoManager: pushState(state.undoManager, newModelState),
        problemZoneExpanded,
      };
    }
  }
}
