import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useCellUndo } from '../hooks/useCellUndo';
import { useContainerSize } from '../hooks/useContainerSize';
import { pointerToMm, snapToGrid, calculateViewBoxHeight } from '../engine/coordinates';
import { snapBarAlignment } from '../engine/snap';
import { getTolerances } from '../engine/tolerances';
import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';
import { CANVAS_WIDTH_MM, BAR_HEIGHT_MM, BAR_VERTICAL_GAP_MM, getToleranceMultiplier } from '../model/types';
import type { Piece, Barre, Boite, ToolType, ToleranceProfile, CouleurPiece, Fleche, Reponse, DroiteNumerique, Tableau, Arbre, Schema, Inconnue, DiagrammeBandes } from '../model/types';
import { isBarre, isBoite, isDroiteNumerique, isTableau, isArbre, isSchema, ARBRE_NODE_W_MM, ARBRE_NODE_H_MM } from '../model/types';
import type { Action } from '../model/state';
import { generateId } from '../model/id';
import { COLORS, UI_BG, UI_BORDER, UI_PRIMARY, UI_TEXT_SECONDARY, getPieceColor, getPieceFillColor } from '../config/theme';
import { BarrePiece } from './pieces/BarrePiece';
import { DroiteNumeriquePiece } from './pieces/DroiteNumeriquePiece';
import { filterBondsOnRangeChange, snapBondsToStep as snapBondsHelper, computeBondPath, computeAutoLabel, snapToStep } from '../engine/bonds';
import { ArbrePiece } from './pieces/ArbrePiece';
import { SchemaPiece } from './pieces/SchemaPiece';
import { DiagrammeBandesPiece } from './pieces/DiagrammeBandesPiece';
import { DiagrammeLignePiece } from './pieces/DiagrammeLignePiece';
import { computeTreeLayout } from '../engine/arbre-layout';
import { computeSchemaWidth, computeSchemaHeight, computePartLayout } from '../engine/schema-layout';
import { getGabaritDefaults } from '../engine/schema-layout';
import { ContextActions } from './ContextActions';
import { ColumnCalc, type ColumnCalcData } from './ColumnCalc';
// TableauEditor overlay removed — editing is now in-place via foreignObject
import { DivisionCalc, type DivisionCalcData } from './DivisionCalc';
import { onPlace, onSnap, onAttach, onDistribute, onAcknowledge, onGhostSnap } from '../engine/sound';
import { computeArrangement } from '../engine/arrange';
import { createSmoothingState, smooth } from '../engine/smoothing';
import type { SmoothingState } from '../engine/smoothing';

interface CanvasProps {
  pieces: Piece[];
  referenceUnitMm: number;
  activeTool: ToolType;
  selectedPieceId: string | null;
  editingPieceId: string | null;
  jetonQuantity: number;
  toleranceProfile: ToleranceProfile;
  cursorSmoothing: boolean;
  smoothingAlpha: number;
  dispatch: React.Dispatch<Action>;
  onSelectPiece: (id: string | null) => void;
  onSetTool: (tool: ToolType) => void;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  arrowFromId?: string | null;
  onSetArrowFrom?: (id: string) => void;
  onArrowCreated?: () => void;
  nudgeMessage?: string;
  equalizingFromId?: string | null;
  onSetEqualizingFromId?: (id: string | null) => void;
  groupingBarId?: string | null;
  onSetGroupingBarId?: (id: string | null) => void;
  showSuggestedZones?: boolean;
  showTokenCounter?: boolean;
  highContrast?: boolean;
  textScale?: number;
  focusMode?: boolean;
  bondMode?: { pieceId: string; fromVal: number | null; chainCount: number } | null;
  onStartBondMode?: (pieceId: string) => void;
  onStopBondMode?: () => void;
  onSetBondFrom?: (val: number) => void;
  onBondCreated?: (pieceId: string, from: number, to: number) => void;
  onBondGhostChange?: (info: { fromVal: number; toVal: number } | null) => void;
  selectedBondInfo?: { pieceId: string; bondIndex: number } | null;
  onSelectBond?: (info: { pieceId: string; bondIndex: number } | null) => void;
  toolbarMode?: 'essentiel' | 'complet';
  hideLockBadge?: boolean;
}

type InteractionMode =
  | { type: 'idle' }
  | { type: 'moving'; pieceId: string };

const JETON_SPACING_MM = 12; // minimum distance between jeton centers

/** Find nearest non-overlapping position for a jeton, spiraling outward. */
function findNonOverlappingPosition(
  pos: { x: number; y: number },
  existingJetons: readonly { x: number; y: number }[],
  spacing: number = JETON_SPACING_MM,
): { x: number; y: number } {
  const overlaps = (x: number, y: number) =>
    existingJetons.some(j => Math.hypot(j.x - x, j.y - y) < spacing);

  if (!overlaps(pos.x, pos.y)) return pos;

  // Spiral outward: 10 rings × 12 angles = 120 attempts max
  for (let ring = 1; ring <= 10; ring++) {
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = (angle * Math.PI) / 180;
      const candidate = snapToGrid(
        pos.x + ring * spacing * Math.cos(rad),
        pos.y + ring * spacing * Math.sin(rad),
      );
      if (!overlaps(candidate.x, candidate.y)) return candidate;
    }
  }
  // Fallback: offset below
  return { x: pos.x, y: pos.y + spacing };
}

function getCanvasCursor(
  activeTool: ToolType,
  isMoving: boolean,
  isHoveringPiece: boolean,
): string {
  if (isMoving) return 'grabbing';
  if (!activeTool && isHoveringPiece) return 'pointer';
  if (activeTool === 'deplacer') return 'grab';
  if (activeTool) return 'crosshair';
  return 'default';
}

export function Canvas({
  pieces,
  referenceUnitMm,
  activeTool,
  selectedPieceId,
  editingPieceId,
  jetonQuantity,
  toleranceProfile: _toleranceProfile,
  cursorSmoothing: _cursorSmoothing,
  smoothingAlpha: _smoothingAlpha,
  dispatch,
  onSelectPiece,
  onSetTool,
  onStartEdit,
  onStopEdit,
  arrowFromId,
  onSetArrowFrom,
  onArrowCreated,
  nudgeMessage,
  equalizingFromId,
  onSetEqualizingFromId,
  groupingBarId,
  onSetGroupingBarId,
  showSuggestedZones,
  showTokenCounter,
  highContrast,
  textScale = 1,
  focusMode,
  bondMode,
  onStartBondMode,
  onStopBondMode,
  onSetBondFrom,
  onBondCreated,
  onBondGhostChange,
  selectedBondInfo,
  onSelectBond,
  toolbarMode = 'essentiel',
  hideLockBadge,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastClickTime = useRef(0);
  const [mode, setMode] = useState<InteractionMode>({ type: 'idle' });
  const activePointerId = useRef<number | null>(null);
  const [columnCalcPieceId, setColumnCalcPieceId] = useState<string | null>(null);
  const [divisionCalcPieceId, setDivisionCalcPieceId] = useState<string | null>(null);
  const [tableauEditorPieceId, setTableauEditorPieceId] = useState<string | null>(null);
  const tableauUndo = useCellUndo(20);
  const [tableauPreviewRows, setTableauPreviewRows] = useState<number | null>(null);
  const [tableauPreviewCols, setTableauPreviewCols] = useState<number | null>(null);
  // Ghost preview states
  const [ghostCursorMm, setGhostCursorMm] = useState<{ x: number; y: number } | null>(null);
  const [dnGhostMarker, setDnGhostMarker] = useState<{ pieceId: string; val: number; xMm: number; isRemoval: boolean } | null>(null);
  const [dnGhostBond, setDnGhostBond] = useState<{
    pieceId: string; fromVal: number; toVal: number;
    path: string; label: string; midX: number; labelY: number;
  } | null>(null);
  const lastGhostBondVal = useRef<number | null>(null);

  // Commit all tableau input values before closing the editor
  const closeTableauEditor = useCallback(() => {
    if (!tableauEditorPieceId) return;
    const piece = pieces.find(p => p.id === tableauEditorPieceId);
    if (piece && piece.type === 'tableau') {
      const t = piece as Tableau;
      // Read current values from all live inputs
      const container = svgRef.current?.parentElement;
      if (container) {
        const inputs = container.querySelectorAll<HTMLInputElement>('input[data-tableau-cell]');
        if (inputs.length > 0) {
          const newCells = t.cells.map(r => [...r]);
          inputs.forEach(input => {
            const [rowStr, colStr] = (input.dataset.tableauCell || '').split('-');
            const row = parseInt(rowStr), col = parseInt(colStr);
            if (!isNaN(row) && !isNaN(col) && row < newCells.length && col < newCells[row].length) {
              newCells[row][col] = input.value;
            }
          });
          dispatch({ type: 'EDIT_PIECE', id: tableauEditorPieceId, changes: { cells: newCells } });
        }
      }
    }
    setTableauEditorPieceId(null);
    setActiveCellRC(null);
  }, [tableauEditorPieceId, pieces, dispatch]);

  // Tableau keyboard navigation helpers
  const [activeCellRC, setActiveCellRC] = useState<{ row: number; col: number } | null>(null);

  const focusTableauCell = useCallback((row: number, col: number) => {
    const el = containerRef.current?.querySelector(
      `input[data-tableau-cell="${row}-${col}"]`
    ) as HTMLInputElement | null;
    el?.focus();
  }, []);

  // Track which cell was clicked to focus it after overlay mounts
  const tableauClickedCell = useRef<{ row: number; col: number } | null>(null);

  // Auto-focus clicked cell (or first empty cell) when entering tableau edit mode
  useEffect(() => {
    if (!tableauEditorPieceId) { setActiveCellRC(null); return; }
    const t = pieces.find(p => p.id === tableauEditorPieceId) as Tableau | undefined;
    if (!t) return;
    const clicked = tableauClickedCell.current;
    tableauClickedCell.current = null;
    setTimeout(() => {
      // Priority: focus the cell that was clicked
      if (clicked && clicked.row < t.rows && clicked.col < t.cols) {
        focusTableauCell(clicked.row, clicked.col);
        return;
      }
      // Fallback: first empty cell
      for (let r = 0; r < t.rows; r++) {
        for (let c = 0; c < t.cols; c++) {
          if (!t.cells[r][c]) { focusTableauCell(r, c); return; }
        }
      }
      focusTableauCell(0, 0);
    }, 50);
  }, [tableauEditorPieceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [lastPlacedId, setLastPlacedId] = useState<string | null>(null);
  const [editingBarField, setEditingBarField] = useState<'label' | 'value' | null>(null);
  const [editingArbreField, setEditingArbreField] = useState<
    | { type: 'node'; levelIndex: number; optionIndex: number; nodeIndex: number }
    | { type: 'level'; levelIndex: number }
    | null
  >(null);
  const editingArbreFieldRef = useRef(editingArbreField);
  useEffect(() => { editingArbreFieldRef.current = editingArbreField; }, [editingArbreField]);
  const [editingSchemaField, setEditingSchemaField] = useState<
    | { type: 'bar-label'; barIndex: number }
    | { type: 'bar-value'; barIndex: number }
    | { type: 'part-label'; barIndex: number; partIndex: number }
    | { type: 'part-value'; barIndex: number; partIndex: number }
    | { type: 'total' }
    | { type: 'diff' }
    | null
  >(null);
  const editingSchemaFieldRef = useRef(editingSchemaField);
  useEffect(() => { editingSchemaFieldRef.current = editingSchemaField; }, [editingSchemaField]);
  useEffect(() => { if (!editingPieceId) { setEditingArbreField(null); setEditingSchemaField(null); } }, [editingPieceId]);
  const [isArranging, setIsArranging] = useState(false);
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);
  const [alignGuide, setAlignGuide] = useState<{ x: number; y1: number; y2: number } | null>(null);
  // Pan removed — drag conflicts with piece movement. Ranger + auto-height suffisent.
  const originalMovePos = useRef<{ x: number; y: number } | null>(null);
  // tableauEditCellRef removed — TableauEditor handles its own cell editing
  const moveOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const smoothingRef = useRef<SmoothingState>(createSmoothingState());

  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const viewBoxHeight = calculateViewBoxHeight(CANVAS_WIDTH_MM, containerWidth, containerHeight);
  const tol = useMemo(() => getTolerances(_toleranceProfile), [_toleranceProfile]);
  const tolMultiplier = getToleranceMultiplier(_toleranceProfile);
  const reponseIds = pieces.filter(p => p.type === 'reponse').map(p => p.id);

  // Clear ghost states when tool or selection changes
  useEffect(() => {
    setGhostCursorMm(null);
    setDnGhostMarker(null);
  }, [activeTool, selectedPieceId]);

  // Haptic flash fallback (iOS/Safari — no vibration API)
  const [hapticFlash, setHapticFlash] = useState(false);
  const hapticTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const handler = () => {
      setHapticFlash(true);
      clearTimeout(hapticTimerRef.current);
      hapticTimerRef.current = setTimeout(() => setHapticFlash(false), 100);
    };
    window.addEventListener('haptic-flash', handler);
    return () => {
      window.removeEventListener('haptic-flash', handler);
      clearTimeout(hapticTimerRef.current);
    };
  }, []);

  // Ghost snap sound — play when ghost marker value changes or arrow snaps to target
  const prevDnGhostVal = useRef<number | null>(null);
  const prevArrowTarget = useRef<string | null>(null);
  useEffect(() => {
    if (dnGhostMarker && dnGhostMarker.val !== prevDnGhostVal.current) {
      if (prevDnGhostVal.current !== null) onGhostSnap();
      prevDnGhostVal.current = dnGhostMarker.val;
    } else if (!dnGhostMarker) {
      prevDnGhostVal.current = null;
    }
  }, [dnGhostMarker]);
  useEffect(() => {
    if (arrowFromId && hoveredPieceId && hoveredPieceId !== prevArrowTarget.current) {
      onGhostSnap();
    }
    prevArrowTarget.current = hoveredPieceId ?? null;
  }, [hoveredPieceId, arrowFromId]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const now = Date.now();
    if (now - lastClickTime.current < tol.clickDebounceMs) return;
    lastClickTime.current = now;

    // If editing, commit current value then close — but for arbre, allow clicking
    // another node directly (commit + switch in one click, like spreadsheet cells).
    if (editingPieceId) {
      // Check if clicking another arbre node/level in the same piece
      const curArbreField = editingArbreFieldRef.current;
      const editingArbre = curArbreField && pieces.find(p => p.id === editingPieceId);
      const nextArbreField = editingArbre && svgRef.current && (() => {
        const pos = pointerToMm(e, svgRef.current!);
        const arbre = editingArbre as Arbre;
        if (!isArbre(arbre)) return null;
        const treeLayout = computeTreeLayout(arbre.levels);
        const relX = pos.x - arbre.x;
        const relY = pos.y - arbre.y;
        const hitPad = 4;
        for (let ni = 0; ni < treeLayout.nodes.length; ni++) {
          const node = treeLayout.nodes[ni];
          if (Math.abs(relX - node.x) <= ARBRE_NODE_W_MM / 2 + hitPad &&
              Math.abs(relY - node.y) <= ARBRE_NODE_H_MM / 2 + hitPad) {
            return { type: 'node' as const, levelIndex: node.levelIndex, optionIndex: node.optionIndex, nodeIndex: ni };
          }
        }
        for (let li = 0; li < arbre.levels.length; li++) {
          const firstNode = treeLayout.nodes.find(n => n.levelIndex === li);
          if (firstNode && relX < 0 && Math.abs(relY - firstNode.y) <= ARBRE_NODE_H_MM / 2 + hitPad) {
            return { type: 'level' as const, levelIndex: li };
          }
        }
        return null;
      })();

      if (nextArbreField) {
        // Commit current input value directly (without blur → onStopEdit cycle)
        const input = document.activeElement;
        if (input instanceof HTMLInputElement) {
          const arbre = editingArbre as Arbre;
          const value = input.value;
          if (curArbreField.type === 'node') {
            const newLevels = arbre.levels.map((l, i) => i === curArbreField.levelIndex
              ? { ...l, options: l.options.map((o, j) => j === curArbreField.optionIndex ? value : o) } : l);
            dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { levels: newLevels } });
          } else {
            const newLevels = arbre.levels.map((l, i) => i === curArbreField.levelIndex ? { ...l, name: value } : l);
            dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { levels: newLevels } });
          }
        }
        // Switch field without closing editor — single render, no flash
        setEditingArbreField(nextArbreField as any);
        return;
      }

      // Schema — click on another label/value switches field directly (spreadsheet pattern)
      const curSchemaField = editingSchemaFieldRef.current;
      const editingSchema = curSchemaField && pieces.find(p => p.id === editingPieceId);
      const nextSchemaField = editingSchema && svgRef.current && isSchema(editingSchema) && (() => {
        const pos = pointerToMm(e, svgRef.current!);
        const schema = editingSchema as Schema;
        const schemaLayout = computePartLayout(schema, referenceUnitMm);
        const relX = pos.x - schema.x;
        const relY = pos.y - schema.y;
        const hitPad = 4;

        // Bar labels (left of bars)
        for (let bi = 0; bi < schemaLayout.bars.length; bi++) {
          const bar = schemaLayout.bars[bi];
          if (relX >= bar.x - 20 && relX <= bar.x - 1 &&
              Math.abs(relY - (bar.y + bar.height / 2)) <= bar.height / 2 + hitPad) {
            return { type: 'bar-label' as const, barIndex: bi };
          }
        }
        // Part labels (above parts)
        for (const part of schemaLayout.parts) {
          if (Math.abs(relX - (part.x + part.width / 2)) <= part.width / 2 + hitPad &&
              relY >= part.y - 10 && relY <= part.y) {
            return { type: 'part-label' as const, barIndex: part.barIndex, partIndex: part.partIndex };
          }
        }
        // Bar values (bar body, no parts)
        for (let bi = 0; bi < schemaLayout.bars.length; bi++) {
          const bar = schemaLayout.bars[bi];
          if (schema.bars[bi]?.parts.length === 0 &&
              relX >= bar.x && relX <= bar.x + bar.width &&
              relY >= bar.y && relY <= bar.y + bar.height) {
            return { type: 'bar-value' as const, barIndex: bi };
          }
        }
        // Part values (inside parts)
        for (const part of schemaLayout.parts) {
          if (relX >= part.x && relX <= part.x + part.width &&
              relY >= part.y && relY <= part.y + part.height) {
            return { type: 'part-value' as const, barIndex: part.barIndex, partIndex: part.partIndex };
          }
        }
        // Total bracket
        if (schemaLayout.totalBracket) {
          const tb = schemaLayout.totalBracket;
          if (relY >= tb.y && relY <= tb.y + tb.height + hitPad &&
              relX >= 0 && relX <= (schemaLayout.bars[0]?.width ?? schemaLayout.width)) {
            return { type: 'total' as const };
          }
        }
        // Diff bracket
        if (schemaLayout.differenceBracket) {
          const db = schemaLayout.differenceBracket;
          if (relX >= db.x && relX <= db.x + 20 &&
              relY >= db.y && relY <= db.y + db.height) {
            return { type: 'diff' as const };
          }
        }
        return null;
      })();

      if (nextSchemaField) {
        // Commit current schema field, then switch
        const input = document.activeElement;
        if (input instanceof HTMLInputElement) {
          const schema = editingSchema as Schema;
          const value = input.value;
          if (curSchemaField.type === 'bar-label') {
            const newBars = schema.bars.map((b, i) => i === curSchemaField.barIndex ? { ...b, label: value } : b);
            dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { bars: newBars } });
          } else if (curSchemaField.type === 'bar-value') {
            const numVal = value === '' ? null : Number(value);
            const newBars = schema.bars.map((b, i) => i === curSchemaField.barIndex ? { ...b, value: isNaN(numVal as number) ? null : numVal } : b);
            dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { bars: newBars } });
          } else if (curSchemaField.type === 'part-label') {
            const { barIndex, partIndex } = curSchemaField;
            const newBars = schema.bars.map((b, i) => i === barIndex ? { ...b, parts: b.parts.map((p, j) => j === partIndex ? { ...p, label: value } : p) } : b);
            dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { bars: newBars } });
          } else if (curSchemaField.type === 'part-value') {
            const { barIndex, partIndex } = curSchemaField;
            const numVal = value === '' ? null : Number(value);
            const newBars = schema.bars.map((b, i) => i === barIndex ? { ...b, parts: b.parts.map((p, j) => j === partIndex ? { ...p, value: isNaN(numVal as number) ? null : numVal } : p) } : b);
            dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { bars: newBars } });
          } else if (curSchemaField.type === 'total' || curSchemaField.type === 'diff') {
            dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { totalLabel: value } });
          }
        }
        // Switch field without closing editor
        setEditingSchemaField(nextSchemaField as any);
        return;
      }

      // Normal case: commit and close
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
        document.activeElement.blur();
      } else {
        onStopEdit();
      }
      return;
    }

    if (!svgRef.current) return;

    // Bond hit-test: check if click landed on an invisible bond arc path
    const bondIdx = (e.target as SVGElement)?.dataset?.bondIndex;
    if (bondIdx !== undefined && !bondMode) {
      const pieceEl = (e.target as SVGElement).closest('[data-piece-id]');
      const pieceId = pieceEl?.getAttribute('data-piece-id');
      if (pieceId) {
        if (selectedPieceId !== pieceId) onSelectPiece(pieceId);
        onSelectBond?.({ pieceId, bondIndex: parseInt(bondIdx) });
        return;
      }
    }

    const pos = pointerToMm(e, svgRef.current);
    const snapped = snapToGrid(pos.x, pos.y);

    // Moving mode: put down the piece (apply pick-up offset)
    if (mode.type === 'moving') {
      const adjusted = { x: snapped.x - moveOffset.current.dx, y: snapped.y - moveOffset.current.dy };
      const finalPos = snapBarAlignment(adjusted, mode.pieceId, pieces, tol.barAlignSnapMm, referenceUnitMm);
      dispatch({ type: 'MOVE_PIECE', id: mode.pieceId, x: finalPos.x, y: finalPos.y });
      setMode({ type: 'idle' });
      return;
    }

    // Bond mode: force hit-test on the target droite first (ignore overlapping pieces)
    if (bondMode) {
      const dn = pieces.find(p => p.id === bondMode.pieceId);
      if (dn && isDroiteNumerique(dn) && hitTest(dn, pos, referenceUnitMm, tol.hitTestPaddingMm, tol.jetonHitPaddingMm, pieces)) {
        const relX = pos.x - dn.x;
        const ratio = relX / dn.width;
        const rawVal = dn.min + ratio * (dn.max - dn.min);
        const snappedVal = snapToStep(rawVal, dn.min, dn.max, dn.step);
        if (bondMode.fromVal === null) {
          onSetBondFrom?.(snappedVal);
        } else if (Math.abs(snappedVal - bondMode.fromVal) > 1e-9) {
          onBondCreated?.(bondMode.pieceId, bondMode.fromVal, snappedVal);
        }
        return;
      }
      // Click outside the droite in bond mode — exit bond mode but keep droite selected
      onStopBondMode?.();
      return;
    }

    // Hit test: small pieces first (jetons > étiquettes > calculs > barres > boîtes)
    const HIT_PRIORITY: Record<string, number> = { jeton: 0, etiquette: 1, calcul: 2, reponse: 3, barre: 4, schema: 4, droiteNumerique: 4, arbre: 5, tableau: 5, fleche: 5, boite: 6 };
    const sortedPieces = [...pieces].sort((a, b) => (HIT_PRIORITY[a.type] ?? 9) - (HIT_PRIORITY[b.type] ?? 9));

    let hitPiece: Piece | null = null;
    let hitDist = Infinity;
    for (const piece of sortedPieces) {
      if (hitTest(piece, pos, referenceUnitMm, tol.hitTestPaddingMm, tol.jetonHitPaddingMm, pieces)) {
        // If a placement tool is active and we hit a boîte, skip it — place inside instead
        // Exception: fleche tool needs to target boîtes as arrow endpoints
        if (activeTool && activeTool !== 'deplacer' && activeTool !== 'fleche' && piece.type === 'boite') {
          continue;
        }
        // Among same-priority pieces, pick the closest to click point
        const dx = pos.x - piece.x;
        const dy = pos.y - piece.y;
        const dist = dx * dx + dy * dy;
        const prio = HIT_PRIORITY[piece.type] ?? 9;
        const bestPrio = hitPiece ? (HIT_PRIORITY[hitPiece.type] ?? 9) : Infinity;
        if (prio < bestPrio || (prio === bestPrio && dist < hitDist)) {
          hitPiece = piece;
          hitDist = dist;
        }
      }
    }

    if (hitPiece) {
      // Equalizing mode — apply source bar's size to target bar
      if (equalizingFromId && isBarre(hitPiece) && hitPiece.id !== equalizingFromId) {
        const sourceBar = pieces.find(p => p.id === equalizingFromId);
        if (sourceBar && isBarre(sourceBar)) {
          dispatch({ type: 'EDIT_PIECE', id: hitPiece.id, changes: { sizeMultiplier: sourceBar.sizeMultiplier } });
        }
        onSetEqualizingFromId?.(null);
        onSelectPiece(null);
        return;
      }
      // Grouping mode — add clicked bar to the group
      if (groupingBarId && isBarre(hitPiece)) {
        const sourceBar = pieces.find(p => p.id === groupingBarId);
        if (sourceBar && isBarre(sourceBar)) {
          const gid = sourceBar.groupId || generateId();
          // Set groupId on source bar if it doesn't have one yet
          if (!sourceBar.groupId) {
            dispatch({ type: 'EDIT_PIECE', id: groupingBarId, changes: { groupId: gid } });
          }
          // Set groupId on target bar
          dispatch({ type: 'EDIT_PIECE', id: hitPiece.id, changes: { groupId: gid } });
        }
        // Stay in grouping mode — click empty space or Escape to end
        return;
      }
      // Bond mode on droite is handled earlier (line ~395) before hit-testing.
      // DroiteNumerique marker toggle — clicking on a selected droite adds/removes a marker
      if (isDroiteNumerique(hitPiece) && hitPiece.id === selectedPieceId && !bondMode) {
        const dn = hitPiece as DroiteNumerique;
        const relX = pos.x - dn.x;
        const ratio = relX / dn.width;
        const nearestVal = Math.round(dn.min + ratio * (dn.max - dn.min));
        const clamped = Math.max(dn.min, Math.min(dn.max, nearestVal));
        // Snap to nearest step
        const safeStep = Math.max(0.1, dn.step);
        const snapped2 = Math.round((clamped - dn.min) / safeStep) * safeStep + dn.min;
        const markers = [...dn.markers];
        const idx = markers.findIndex(m => Math.abs(m - snapped2) < 0.001);
        if (idx >= 0) markers.splice(idx, 1);
        else markers.push(snapped2);
        dispatch({ type: 'EDIT_PIECE', id: hitPiece.id, changes: { markers } });
        return; // don't re-select
      }
      // Tableau — toggle in-place editing (only when no tool is active)
      if (isTableau(hitPiece) && !activeTool) {
        // Calculate which cell was clicked
        const clickedCol = Math.floor((pos.x - hitPiece.x) / TABLEAU_CELL_W);
        const clickedRow = Math.floor((pos.y - hitPiece.y) / TABLEAU_CELL_H);
        if (tableauEditorPieceId === hitPiece.id) {
          // Already editing — focus the clicked cell directly
          focusTableauCell(clickedRow, clickedCol);
          return;
        }
        tableauClickedCell.current = { row: clickedRow, col: clickedCol };
        setTableauEditorPieceId(hitPiece.id);
        onSelectPiece(hitPiece.id);
        return;
      }
      // Bar — 2nd click edits value (unless subdivided — those toggle coloring)
      if (isBarre(hitPiece) && hitPiece.id === selectedPieceId && !hitPiece.divisions) {
        setEditingBarField('value');
        onStartEdit(hitPiece.id);
        return;
      }
      // Subdivision toggle — clicking on a subdivided bar that is already selected
      if (isBarre(hitPiece) && hitPiece.id === selectedPieceId && hitPiece.divisions) {
        const barW = hitPiece.sizeMultiplier * referenceUnitMm;
        const relX = pos.x - hitPiece.x;
        const partIdx = Math.floor(relX / (barW / hitPiece.divisions));
        if (partIdx >= 0 && partIdx < hitPiece.divisions) {
          const colored = [...(hitPiece.coloredParts || [])];
          const idx = colored.indexOf(partIdx);
          if (idx >= 0) colored.splice(idx, 1);
          else colored.push(partIdx);
          dispatch({ type: 'EDIT_PIECE', id: hitPiece.id, changes: { coloredParts: colored } });
          return; // don't re-select
        }
      }
      // Fleche tool — two-click placement
      if (activeTool === 'fleche' && hitPiece.type !== 'fleche') {
        if (!arrowFromId) {
          onSetArrowFrom?.(hitPiece.id);
        } else if (hitPiece.id !== arrowFromId) {
          const arrow: Fleche = {
            id: generateId(),
            type: 'fleche',
            x: 0,
            y: 0,
            locked: false,
            fromId: arrowFromId,
            toId: hitPiece.id,
            label: '',
          };
          dispatch({ type: 'PLACE_PIECE', piece: arrow });
          onPlace();
          onAttach();
          onArrowCreated?.();
          onSetTool(null);
        }
        return;
      }
      // Move tool — start moving the piece
      if (activeTool === 'deplacer') {
        // Capture pointer for reliable touch drag (prevents browser scroll stealing events)
        if (e.pointerType !== 'mouse' && svgRef.current) {
          svgRef.current.setPointerCapture(e.pointerId);
          activePointerId.current = e.pointerId;
        }
        handleStartMove(hitPiece.id, pos);
        return;
      }
      // Calcul/Réponse/Étiquette — 1st click selects (context actions), 2nd click edits
      if (hitPiece.type === 'calcul' || hitPiece.type === 'reponse' || hitPiece.type === 'etiquette') {
        if (hitPiece.id === selectedPieceId) {
          // Already selected — enter edit mode
          onStartEdit(hitPiece.id);
        } else {
          // First click — select to show context actions
          onSelectPiece(hitPiece.id);
        }
        return;
      }
      // Arbre — click on node/level enters edit mode directly (like tableau cells)
      if (isArbre(hitPiece) && !activeTool) {
        const arbre = hitPiece as Arbre;
        const treeLayout = computeTreeLayout(arbre.levels);
        const relX = pos.x - arbre.x;
        const relY = pos.y - arbre.y;
        const hitPad = 4; // mm — enlarged hit area for TDC

        // Check nodes
        let found = false;
        for (let ni = 0; ni < treeLayout.nodes.length; ni++) {
          const node = treeLayout.nodes[ni];
          if (Math.abs(relX - node.x) <= ARBRE_NODE_W_MM / 2 + hitPad &&
              Math.abs(relY - node.y) <= ARBRE_NODE_H_MM / 2 + hitPad) {
            setEditingArbreField({ type: 'node', levelIndex: node.levelIndex, optionIndex: node.optionIndex, nodeIndex: ni });
            onSelectPiece(hitPiece.id);
            onStartEdit(hitPiece.id);
            found = true;
            break;
          }
        }
        if (!found) {
          // Check level names (left of tree)
          for (let li = 0; li < arbre.levels.length; li++) {
            const firstNode = treeLayout.nodes.find(n => n.levelIndex === li);
            if (firstNode && relX < 0 && Math.abs(relY - firstNode.y) <= ARBRE_NODE_H_MM / 2 + hitPad) {
              setEditingArbreField({ type: 'level', levelIndex: li });
              onSelectPiece(hitPiece.id);
              onStartEdit(hitPiece.id);
              found = true;
              break;
            }
          }
        }
        if (!found) {
          // Click on arbre but not on a specific node/level — just select
          onSelectPiece(hitPiece.id);
        }
        return;
      }
      // Schema — 2nd click on label area enters edit mode (1st click = select only, ergo TDC)
      if (isSchema(hitPiece) && hitPiece.id === selectedPieceId && !activeTool) {
        const schema = hitPiece as Schema;
        const schemaLayout = computePartLayout(schema, referenceUnitMm);
        const relX = pos.x - schema.x;
        const relY = pos.y - schema.y;
        const hitPad = 4; // mm — TDC accessibility

        let schemaFound = false;

        // Check bar labels (left of bars)
        for (let bi = 0; bi < schemaLayout.bars.length; bi++) {
          const bar = schemaLayout.bars[bi];
          if (relX >= bar.x - 20 && relX <= bar.x - 1 &&
              Math.abs(relY - (bar.y + bar.height / 2)) <= bar.height / 2 + hitPad) {
            setEditingSchemaField({ type: 'bar-label', barIndex: bi });
            onStartEdit(hitPiece.id);
            schemaFound = true;
            break;
          }
        }

        // Check part labels (above parts)
        if (!schemaFound) {
          for (const part of schemaLayout.parts) {
            if (Math.abs(relX - (part.x + part.width / 2)) <= part.width / 2 + hitPad &&
                relY >= part.y - 10 && relY <= part.y) {
              setEditingSchemaField({ type: 'part-label', barIndex: part.barIndex, partIndex: part.partIndex });
              onStartEdit(hitPiece.id);
              schemaFound = true;
              break;
            }
          }
        }

        // Check total bracket label (below)
        if (!schemaFound && schemaLayout.totalBracket) {
          const tb = schemaLayout.totalBracket;
          if (relY >= tb.y && relY <= tb.y + tb.height + hitPad &&
              relX >= 0 && relX <= (schemaLayout.bars[0]?.width ?? schemaLayout.width)) {
            setEditingSchemaField({ type: 'total' });
            onStartEdit(hitPiece.id);
            schemaFound = true;
          }
        }

        // Check difference bracket label (right)
        if (!schemaFound && schemaLayout.differenceBracket) {
          const db = schemaLayout.differenceBracket;
          if (relX >= db.x && relX <= db.x + 20 &&
              relY >= db.y && relY <= db.y + db.height) {
            setEditingSchemaField({ type: 'diff' });
            onStartEdit(hitPiece.id);
            schemaFound = true;
          }
        }

        // Check bar body clicks (value editing) — only bars without parts
        if (!schemaFound) {
          for (let bi = 0; bi < schemaLayout.bars.length; bi++) {
            const bar = schemaLayout.bars[bi];
            if (schema.bars[bi]?.parts.length === 0 &&
                relX >= bar.x && relX <= bar.x + bar.width &&
                relY >= bar.y && relY <= bar.y + bar.height) {
              setEditingSchemaField({ type: 'bar-value', barIndex: bi });
              onStartEdit(hitPiece.id);
              schemaFound = true;
              break;
            }
          }
        }

        // Check part body clicks (value editing)
        if (!schemaFound) {
          for (const part of schemaLayout.parts) {
            if (relX >= part.x && relX <= part.x + part.width &&
                relY >= part.y && relY <= part.y + part.height) {
              setEditingSchemaField({ type: 'part-value', barIndex: part.barIndex, partIndex: part.partIndex });
              onStartEdit(hitPiece.id);
              schemaFound = true;
              break;
            }
          }
        }

        if (schemaFound) return;
      }
      // Boîte — 2nd click edits value (same pattern as bar)
      if (isBoite(hitPiece) && hitPiece.id === selectedPieceId) {
        setEditingBarField('value');
        onStartEdit(hitPiece.id);
        return;
      }
      if (tableauEditorPieceId) closeTableauEditor();
      onSelectPiece(hitPiece.id);
      return;
    }

    // Equalizing mode — click on empty space cancels
    if (equalizingFromId) {
      onSetEqualizingFromId?.(null);
      return;
    }

    // Grouping mode — click on empty space ends grouping
    if (groupingBarId) {
      onSetGroupingBarId?.(null);
      return;
    }

    // Fleche tool — click on empty space cancels
    if (activeTool === 'fleche') {
      onArrowCreated?.(); // resets arrowFromId
      return;
    }

    // Click on empty space — place a piece if tool is active
    if (activeTool) {
      // Jeton with quantity > 1: place multiple
      if (activeTool === 'jeton' && jetonQuantity > 1) {
        const jetons: Piece[] = [];
        const spacing = 10; // mm between jetons
        const perRow = 10;
        // Check if placing inside a boîte
        const targetBoite = pieces.find(p => {
          if (p.type !== 'boite') return false;
          return snapped.x >= p.x && snapped.x <= p.x + (p as any).width &&
                 snapped.y >= p.y && snapped.y <= p.y + (p as any).height;
        });
        const existingJetons = pieces.filter(p => p.type === 'jeton');
        for (let i = 0; i < jetonQuantity; i++) {
          const col = i % perRow;
          const row = Math.floor(i / perRow);
          const intended = { x: snapped.x + col * spacing, y: snapped.y + row * spacing };
          const safe = findNonOverlappingPosition(intended, [...existingJetons, ...jetons]);
          jetons.push({
            id: generateId(),
            type: 'jeton',
            x: safe.x,
            y: safe.y,
            locked: false,
            couleur: 'bleu',
            parentId: targetBoite ? targetBoite.id : null,
          });
        }
        dispatch({ type: 'PLACE_PIECES', pieces: jetons });
        onPlace();
        // Keep jeton tool active for rapid placement
      } else if (activeTool === 'reponse' && pieces.filter(p => p.type === 'reponse').length >= 2) {
        // Max 2 réponses — select first existing
        const existing = pieces.find(p => p.type === 'reponse');
        if (existing) {
          onSelectPiece(existing.id);
          onStartEdit(existing.id);
        }
        onSetTool(null);
      } else {
        const piece = createPiece(activeTool, snapped, referenceUnitMm);
        if (!piece) return; // deplacer tool — no piece to create
        // Center large pieces on cursor for better spatial anticipation (TDC)
        if (piece.type === 'droiteNumerique') {
          piece.x = snapped.x - (piece as DroiteNumerique).width / 2;
        } else if (piece.type === 'tableau') {
          piece.x = snapped.x - (piece as Tableau).cols * TABLEAU_CELL_W / 2;
          piece.y = snapped.y - (piece as Tableau).rows * TABLEAU_CELL_H / 2;
        } else if (piece.type === 'arbre') {
          const treeLayout = computeTreeLayout((piece as Arbre).levels);
          piece.x = snapped.x - treeLayout.width / 2;
          piece.y = snapped.y - treeLayout.height / 4;
        } else if (piece.type === 'schema') {
          const schemaW = computeSchemaWidth(piece as Schema, referenceUnitMm);
          const schemaH = computeSchemaHeight(piece as Schema);
          piece.x = snapped.x - schemaW / 2;
          piece.y = snapped.y - schemaH / 2;
        }
        if (piece.type === 'barre') {
          const aligned = snapBarAlignment({ x: piece.x, y: piece.y }, piece.id, pieces, tol.barAlignSnapMm, referenceUnitMm);
          if (aligned.x !== piece.x || aligned.y !== piece.y) onSnap();
          piece.x = aligned.x;
          piece.y = aligned.y;
        }
        // Auto-parent jeton to boîte if placed inside
        if (piece.type === 'jeton') {
          const boite = pieces.find(p => {
            if (p.type !== 'boite') return false;
            return snapped.x >= p.x && snapped.x <= p.x + (p as any).width &&
                   snapped.y >= p.y && snapped.y <= p.y + (p as any).height;
          });
          if (boite) {
            (piece as any).parentId = boite.id;
          }
          // Auto-place to avoid overlapping existing jetons
          const existingJetons = pieces.filter(p => p.type === 'jeton');
          const safe = findNonOverlappingPosition({ x: piece.x, y: piece.y }, existingJetons);
          piece.x = safe.x;
          piece.y = safe.y;
        }
        // B7: Auto-attach étiquette/inconnue to nearby piece
        if (piece.type === 'etiquette' || piece.type === 'inconnue') {
          const nearbyPiece = pieces.find(p => {
            if (p.type === 'etiquette' || p.type === 'fleche' || p.type === 'inconnue') return false;
            const center = getPieceCenter(p, referenceUnitMm);
            const dist = Math.hypot(snapped.x - center.x, snapped.y - center.y);
            return dist < 15;
          });
          if (nearbyPiece) {
            (piece as any).attachedTo = nearbyPiece.id;
            onAttach();
          }
        }
        dispatch({ type: 'PLACE_PIECE', piece });
        onPlace(); // sound + haptic
        setLastPlacedId(piece.id);
        setTimeout(() => setLastPlacedId(null), 200);
        // Jeton: keep tool active for rapid placement; other tools: deactivate after placement
        if (activeTool !== 'jeton') {
          onSetTool(null);
        }
        // Auto-edit text pieces; auto-select others (skip for jeton in rapid placement)
        if (piece.type === 'calcul' || piece.type === 'reponse' || piece.type === 'etiquette' || piece.type === 'inconnue') {
          onStartEdit(piece.id);
        } else if (activeTool !== 'jeton') {
          onSelectPiece(piece.id);
        }
      }
    } else {
      // No tool active, click on empty space — deselect
      if (tableauEditorPieceId) closeTableauEditor();
      onSelectPiece(null);
    }
  }, [pieces, activeTool, referenceUnitMm, dispatch, onSelectPiece, onSetTool, mode, tol,
      editingPieceId, jetonQuantity, onStartEdit, onStopEdit,
      arrowFromId, onSetArrowFrom, onArrowCreated,
      equalizingFromId, onSetEqualizingFromId, groupingBarId, onSetGroupingBarId, selectedPieceId,
      tableauEditorPieceId, closeTableauEditor,
      bondMode, onSetBondFrom, onBondCreated, onSelectBond]);

  // Pointer move for pick-up/put-down + hover hit-test for cursor
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rawPos = pointerToMm(e, svgRef.current);

    if (mode.type === 'moving') {
      // R5: Apply cursor smoothing if enabled
      let pos: { x: number; y: number };
      if (_cursorSmoothing) {
        const result = smooth(smoothingRef.current, rawPos.x, rawPos.y, _smoothingAlpha);
        smoothingRef.current = result.state;
        pos = { x: result.x, y: result.y };
      } else {
        pos = rawPos;
      }
      // Subtract pick-up offset so piece doesn't jump to cursor
      const adjusted = { x: pos.x - moveOffset.current.dx, y: pos.y - moveOffset.current.dy };
      const snapped = snapToGrid(adjusted.x, adjusted.y);
      const snapResult = snapBarAlignment(snapped, mode.pieceId, pieces, tol.barAlignSnapMm, referenceUnitMm);
      dispatch({ type: 'MOVE_PIECE_LIVE', id: mode.pieceId, x: snapResult.x, y: snapResult.y });
      // Show alignment guide when snapped
      if (snapResult.aligned && snapResult.alignRefY !== undefined) {
        const y1 = Math.min(snapResult.y, snapResult.alignRefY);
        const y2 = Math.max(snapResult.y + BAR_HEIGHT_MM, snapResult.alignRefY + BAR_HEIGHT_MM);
        setAlignGuide({ x: snapResult.x, y1, y2 });
      } else {
        setAlignGuide(null);
      }
      return;
    }

    // Ghost cursor tracking for fleche (with arrowFromId) and piece placement
    if ((activeTool === 'fleche' && arrowFromId) ||
        (activeTool && activeTool !== 'deplacer' && activeTool !== 'fleche')) {
      const snapped = snapToGrid(rawPos.x, rawPos.y);
      // Jeton ghost: show at auto-placed position to preview actual landing spot
      if (activeTool === 'jeton') {
        const existingJetons = pieces.filter(p => p.type === 'jeton');
        setGhostCursorMm(findNonOverlappingPosition(snapped, existingJetons));
      } else {
        setGhostCursorMm(snapped);
      }
      // For fleche: hit-test to detect target piece (skip source + other arrows)
      if (activeTool === 'fleche' && arrowFromId) {
        let found: string | null = null;
        for (const piece of pieces) {
          if (piece.id === arrowFromId || piece.type === 'fleche') continue;
          if (hitTest(piece, rawPos, referenceUnitMm, tol.hitTestPaddingMm, tol.jetonHitPaddingMm, pieces)) {
            found = piece.id;
            break;
          }
        }
        setHoveredPieceId(found);
      }
      return;
    }

    // Hover hit-test for cursor affordance (idle mode only)
    if (!activeTool) {
      const pos = snapToGrid(rawPos.x, rawPos.y);
      let found: string | null = null;
      for (const piece of pieces) {
        if (hitTest(piece, pos, referenceUnitMm, tol.hitTestPaddingMm, tol.jetonHitPaddingMm, pieces)) {
          found = piece.id;
          break;
        }
      }
      setHoveredPieceId(found);

      // Ghost bond arc for bond mode (takes priority over ghost marker)
      if (bondMode && bondMode.fromVal !== null && bondMode.pieceId) {
        const dn = pieces.find(p => p.id === bondMode.pieceId);
        if (dn && isDroiteNumerique(dn)) {
          const relX = rawPos.x - dn.x;
          const ratio = relX / dn.width;
          const rawVal = dn.min + ratio * (dn.max - dn.min);
          const snapped = snapToStep(rawVal, dn.min, dn.max, dn.step);
          if (Math.abs(snapped - bondMode.fromVal) > 1e-9) {
            const info = computeBondPath({ from: bondMode.fromVal, to: snapped, label: '' }, { x: dn.x, y: dn.y, min: dn.min, max: dn.max, width: dn.width }, 0);
            const label = computeAutoLabel(toolbarMode, bondMode.fromVal, snapped);
            const labelArcY = (dn.y + info.cpY) / 2;
            const labelY = info.direction === -1 ? labelArcY - 2 : labelArcY + 4;
            setDnGhostBond({ pieceId: bondMode.pieceId, fromVal: bondMode.fromVal, toVal: snapped, path: info.path, label, midX: info.midX, labelY });
            // Ghost snap sound when value changes
            if (lastGhostBondVal.current !== null && Math.abs(lastGhostBondVal.current - snapped) > 1e-9) {
              onGhostSnap();
            }
            lastGhostBondVal.current = snapped;
          } else {
            setDnGhostBond(null);
            lastGhostBondVal.current = null;
          }
          setDnGhostMarker(null);
          onBondGhostChange?.({ fromVal: bondMode.fromVal, toVal: snapped });
        } else {
          setDnGhostBond(null);
          onBondGhostChange?.(null);
        }
      } else if (bondMode) {
        // Bond mode active but no fromVal yet — no ghost bond
        setDnGhostBond(null);
        setDnGhostMarker(null);
        onBondGhostChange?.(null);
      } else {
        // Ghost marker for selected droiteNumerique (normal mode)
        setDnGhostBond(null);
        if (found && found === selectedPieceId) {
          const dn = pieces.find(p => p.id === found);
          if (dn && isDroiteNumerique(dn)) {
            const relX = rawPos.x - dn.x;
            const ratio = relX / dn.width;
            const nearestVal = Math.round(dn.min + ratio * (dn.max - dn.min));
            const clamped = Math.max(dn.min, Math.min(dn.max, nearestVal));
            const safeStep = Math.max(0.1, dn.step);
            const snapped = Math.round((clamped - dn.min) / safeStep) * safeStep + dn.min;
            const mx = dn.x + ((snapped - dn.min) / (dn.max - dn.min)) * dn.width;
            const isRemoval = dn.markers.some(m => Math.abs(m - snapped) < 0.001);
            setDnGhostMarker({ pieceId: found, val: snapped, xMm: mx, isRemoval });
          } else {
            setDnGhostMarker(null);
          }
        } else {
          setDnGhostMarker(null);
        }
      }
    }
  }, [mode, pieces, referenceUnitMm, tol, activeTool, _cursorSmoothing, dispatch, arrowFromId, selectedPieceId, bondMode, toolbarMode, onBondGhostChange]);

  // Pointer up — finalize move ONLY for touch/pen (finger lift = put down).
  // Mouse uses click-click (pick up on pointerDown, put down on next pointerDown).
  // This avoids drag-and-drop which requires too much precision for young children.
  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Touch fallback for bond mode: finger lift = confirm bond at ghost position
    if (bondMode && bondMode.fromVal !== null && dnGhostBond && e.pointerType !== 'mouse') {
      onBondCreated?.(dnGhostBond.pieceId, dnGhostBond.fromVal, dnGhostBond.toVal);
      setDnGhostBond(null);
      return;
    }
    if (mode.type !== 'moving' || !svgRef.current) return;
    if (e.pointerType === 'mouse') return; // mouse uses click-click, not drag
    const pos = pointerToMm(e, svgRef.current);
    const adjusted = { x: pos.x - moveOffset.current.dx, y: pos.y - moveOffset.current.dy };
    const snapped = snapToGrid(adjusted.x, adjusted.y);
    const snapResult = snapBarAlignment(snapped, mode.pieceId, pieces, tol.barAlignSnapMm, referenceUnitMm);
    dispatch({ type: 'MOVE_PIECE', id: mode.pieceId, x: snapResult.x, y: snapResult.y });
    setMode({ type: 'idle' });
    setAlignGuide(null);
    originalMovePos.current = null;
    // Release pointer capture
    if (activePointerId.current !== null && svgRef.current) {
      try { svgRef.current.releasePointerCapture(activePointerId.current); } catch { /* already released */ }
      activePointerId.current = null;
    }
  }, [mode, pieces, referenceUnitMm, tol.barAlignSnapMm, dispatch, bondMode, dnGhostBond, onBondCreated]);

  // Start moving a piece (pick-up) — records offset between cursor and piece origin
  const handleStartMove = useCallback((pieceId: string, cursorPos: { x: number; y: number }) => {
    const piece = pieces.find(p => p.id === pieceId);
    smoothingRef.current = createSmoothingState();
    if (piece) {
      originalMovePos.current = { x: piece.x, y: piece.y };
      moveOffset.current = { dx: cursorPos.x - piece.x, dy: cursorPos.y - piece.y };
    }
    setMode({ type: 'moving', pieceId });
    onSelectPiece(null);
  }, [pieces, onSelectPiece]);

  // Escape during move: restore original position
  useEffect(() => {
    if (mode.type !== 'moving') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (originalMovePos.current) {
          dispatch({ type: 'MOVE_PIECE_LIVE', id: mode.pieceId, x: originalMovePos.current.x, y: originalMovePos.current.y });
        }
        setMode({ type: 'idle' });
        originalMovePos.current = null;
        if (activePointerId.current !== null && svgRef.current) {
          try { svgRef.current.releasePointerCapture(activePointerId.current); } catch { /* already released */ }
          activePointerId.current = null;
        }
      }
    };
    window.addEventListener('keydown', handler, true); // capture phase — before App.tsx
    return () => window.removeEventListener('keydown', handler, true);
  }, [mode, dispatch]);

  // Resize bar
  const handleResizeBar = useCallback((id: string, multiplier: number) => {
    dispatch({ type: 'EDIT_PIECE', id, changes: { sizeMultiplier: multiplier } });
  }, [dispatch]);

  // Change piece color
  const handleChangeColor = useCallback((id: string, couleur: CouleurPiece) => {
    dispatch({ type: 'EDIT_PIECE', id, changes: { couleur } });
  }, [dispatch]);

  // Complete jetons to N total (source counts as 1)
  const handleDuplicateJetons = useCallback((id: string, targetTotal: number) => {
    const source = pieces.find(p => p.id === id);
    if (!source || source.type !== 'jeton') return;
    const toAdd = targetTotal - 1; // source already counts as 1
    if (toAdd <= 0) return;
    const spacing = 10;
    const existingJetons = pieces.filter(p => p.type === 'jeton');
    const newJetons: Piece[] = [];
    for (let i = 1; i <= toAdd; i++) {
      const intended = {
        x: source.x + (i % 10) * spacing,
        y: source.y + Math.floor(i / 10) * spacing,
      };
      const safe = findNonOverlappingPosition(intended, [...existingJetons, ...newJetons]);
      newJetons.push({
        id: generateId(),
        type: 'jeton',
        x: safe.x,
        y: safe.y,
        locked: false,
        couleur: source.couleur,
        parentId: source.parentId, // I2: preserve parentId from source jeton
      });
    }
    dispatch({ type: 'PLACE_PIECES', pieces: newJetons });
    onSelectPiece(null);
  }, [pieces, dispatch, onSelectPiece]);

  // Répartir jetons en groupes égaux
  const freeJetonCount = pieces.filter(p => p.type === 'jeton' && !(p as any).parentId).length;
  const handleRepartirJetons = useCallback((groupCount: number) => {
    const freeJetons = pieces.filter(p => p.type === 'jeton' && !(p as any).parentId);
    if (freeJetons.length < 2) return;
    const maxY = Math.max(...freeJetons.map(p => p.y));
    const minX = Math.min(...freeJetons.map(p => p.x));
    const startPos = snapToGrid(minX, maxY + 20);
    dispatch({
      type: 'REPARTIR_JETONS',
      jetonIds: freeJetons.map(p => p.id),
      groupCount,
      startX: startPos.x,
      startY: startPos.y,
    });
    onDistribute();
    onSelectPiece(null);
  }, [pieces, dispatch, onSelectPiece]);

  // Duplicate bar
  const handleDuplicateBar = useCallback((id: string, count: number) => {
    const source = pieces.find(p => p.id === id);
    if (!source || !isBarre(source)) return;

    const colorOrder: CouleurPiece[] = ['bleu', 'rouge', 'vert', 'jaune'];
    const sourceColorIdx = colorOrder.indexOf(source.couleur);
    const newBars: Piece[] = [];
    for (let i = 1; i <= count; i++) {
      newBars.push({
        id: generateId(),
        type: 'barre',
        x: source.x,
        y: source.y + (BAR_HEIGHT_MM + BAR_VERTICAL_GAP_MM) * i,
        locked: false,
        couleur: colorOrder[(sourceColorIdx + i) % colorOrder.length],
        sizeMultiplier: source.sizeMultiplier,
        label: source.label,
        value: source.value,
        divisions: source.divisions,
        coloredParts: [...source.coloredParts],
        showFraction: source.showFraction,
               groupId: null,
        groupLabel: null,
      });
    }
    dispatch({ type: 'PLACE_PIECES', pieces: newBars });
    onSelectPiece(null);
  }, [pieces, dispatch, onSelectPiece]);

  // Duplicate boite (with children)
  const handleDuplicateBoite = useCallback((id: string, _count: number) => {
    const source = pieces.find(p => p.id === id);
    if (!source || !isBoite(source)) return;

    const sourceChildren = pieces.filter(
      p => p.type === 'jeton' && (p as any).parentId === id
    );
    if (sourceChildren.length === 0) return;

    const colorOrder: CouleurPiece[] = ['bleu', 'rouge', 'vert', 'jaune'];
    const sourceColorIdx = colorOrder.indexOf(source.couleur);
    const gap = 10; // mm
    const maxX = CANVAS_WIDTH_MM - 15;

    const newBoiteId = generateId();

    // Place to the right; fall back below if overflow
    let bx = source.x + source.width + gap;
    let by = source.y;
    if (bx + source.width > maxX) {
      bx = source.x;
      by = source.y + source.height + gap;
    }

    const dx = bx - source.x;
    const dy = by - source.y;

    const newPieces: Piece[] = [];

    newPieces.push({
      id: newBoiteId,
      type: 'boite',
      x: bx,
      y: by,
      locked: false,
      width: source.width,
      height: source.height,
      label: source.label,
      value: source.value,
      couleur: colorOrder[(sourceColorIdx + 1) % colorOrder.length],
    } as Boite);

    for (const child of sourceChildren) {
      newPieces.push({
        id: generateId(),
        type: 'jeton',
        x: child.x + dx,
        y: child.y + dy,
        locked: false,
        couleur: (child as any).couleur ?? 'bleu',
        parentId: newBoiteId,
      } as any);
    }

    dispatch({ type: 'PLACE_PIECES', pieces: newPieces });
    onSelectPiece(null);
  }, [pieces, dispatch, onSelectPiece]);

  // Edit piece (generic)
  const handleEditPiece = useCallback((id: string, changes: Record<string, unknown>) => {
    // When resizing a tableau that's being edited, merge DOM input values into the new cells
    if (('rows' in changes || 'cols' in changes) && tableauEditorPieceId === id && Array.isArray(changes.cells)) {
      const container = svgRef.current?.parentElement;
      if (container) {
        const inputs = container.querySelectorAll<HTMLInputElement>('input[data-tableau-cell]');
        const newCells = (changes.cells as string[][]).map(r => [...r]);
        inputs.forEach(input => {
          const [rowStr, colStr] = (input.dataset.tableauCell || '').split('-');
          const row = parseInt(rowStr), col = parseInt(colStr);
          if (!isNaN(row) && !isNaN(col) && row < newCells.length && col < newCells[row].length) {
            newCells[row][col] = input.value;
          }
        });
        changes = { ...changes, cells: newCells };
      }
    }
    // When min/max/step changes on a droiteNumerique, filter/resnap bonds atomically
    if ('min' in changes || 'max' in changes || 'step' in changes) {
      const piece = pieces.find(p => p.id === id);
      if (piece && isDroiteNumerique(piece) && (piece.bonds?.length ?? 0) > 0) {
        const newMin = (changes.min ?? piece.min) as number;
        const newMax = (changes.max ?? piece.max) as number;
        const newStep = (changes.step ?? piece.step) as number;
        let bonds = piece.bonds;
        if ('min' in changes || 'max' in changes) {
          bonds = filterBondsOnRangeChange(bonds, newMin, newMax);
        }
        if ('step' in changes) {
          bonds = snapBondsHelper(bonds, newStep, newMin, newMax, toolbarMode ?? 'essentiel');
        }
        changes = { ...changes, bonds };
      }
    }
    dispatch({ type: 'EDIT_PIECE', id, changes });
  }, [dispatch, tableauEditorPieceId, pieces, toolbarMode]);

  // Start equalizing — triggered from ContextActions
  const handleStartEqualizing = useCallback((id: string) => {
    onSetEqualizingFromId?.(id);
    onSelectPiece(null);
  }, [onSetEqualizingFromId, onSelectPiece]);

  // Start grouping — triggered from ContextActions
  const handleStartGrouping = useCallback((id: string) => {
    onSetGroupingBarId?.(id);
    onSelectPiece(null);
  }, [onSetGroupingBarId, onSelectPiece]);

  // I1: Ungroup — atomic operation instead of N individual dispatches
  const handleUngroup = useCallback((groupId: string) => {
    dispatch({ type: 'UNGROUP_BARRES', groupId });
    onSelectPiece(null);
  }, [dispatch, onSelectPiece]);

  // Right-click = cancel/escape
  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (mode.type === 'moving') {
      // Cancel move — restore original position
      if (originalMovePos.current) {
        dispatch({ type: 'MOVE_PIECE_LIVE', id: mode.pieceId, x: originalMovePos.current.x, y: originalMovePos.current.y });
      }
      setMode({ type: 'idle' });
      originalMovePos.current = null;
    } else if (editingPieceId) {
      onStopEdit();
    } else if (selectedPieceId) {
      onSelectPiece(null);
    } else if (activeTool) {
      onSetTool(null);
    }
  }, [mode, editingPieceId, selectedPieceId, activeTool, dispatch, onStopEdit, onSelectPiece, onSetTool]);

  const selectedPiece = selectedPieceId ? pieces.find(p => p.id === selectedPieceId) : null;

  // R7: Ranger button — arrange pieces with animation
  const arrangeRafRef = useRef<number | null>(null);
  useEffect(() => () => { if (arrangeRafRef.current) cancelAnimationFrame(arrangeRafRef.current); }, []);
  const handleArrange = useCallback(() => {
    if (isArranging) return;
    const moves = computeArrangement(pieces, referenceUnitMm, viewBoxHeight);
    if (moves.length === 0) return;

    setIsArranging(true);

    // Capture starting positions
    const startPositions = new Map(pieces.map(p => [p.id, { x: p.x, y: p.y }]));
    const startTime = performance.now();
    const duration = 400;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out: 1 - (1-t)^2
      const eased = 1 - (1 - progress) * (1 - progress);

      for (const move of moves) {
        const start = startPositions.get(move.id);
        if (!start) continue;
        // Use DELTA from current position (piece renders at absolute coords)
        const dx = (move.x - start.x) * eased;
        const dy = (move.y - start.y) * eased;
        const el = document.querySelector(`[data-piece-id="${move.id}"]`);
        if (el) el.setAttribute('transform', `translate(${dx},${dy})`);
      }

      if (progress < 1) {
        arrangeRafRef.current = requestAnimationFrame(animate);
      } else {
        // Dispatch first — React re-renders pieces at final coords
        dispatch({ type: 'ARRANGE_PIECES', moves });
        setIsArranging(false);
        // Clean animation transforms AFTER React commit (next frame)
        arrangeRafRef.current = requestAnimationFrame(() => {
          arrangeRafRef.current = null;
          for (const move of moves) {
            const el = document.querySelector(`[data-piece-id="${move.id}"]`);
            if (el) el.removeAttribute('transform');
          }
        });
      }
    }

    arrangeRafRef.current = requestAnimationFrame(animate);
  }, [pieces, referenceUnitMm, isArranging, dispatch]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        background: COLORS.canvasBg,
        position: 'relative',
        zIndex: 1, // context actions (z-index:10) must escape above status bar
        overflow: 'hidden',
        cursor: getCanvasCursor(activeTool, mode.type === 'moving', !!hoveredPieceId),
        // Haptic flash fallback (iOS/Safari) — brief border pulse
        ...(hapticFlash ? { boxShadow: 'inset 0 0 0 3px rgba(112, 40, 224, 0.3)', transition: 'box-shadow 0.1s' } : {}),
      }}
    >
      <svg
        ref={svgRef}
        data-testid="canvas-svg"
        role="application"
        tabIndex={0}
        aria-label={`Canevas de modélisation — ${pieces.length} pièce${pieces.length !== 1 ? 's' : ''}`}
        aria-roledescription="Espace de travail interactif"
        viewBox={`0 0 ${CANVAS_WIDTH_MM} ${viewBoxHeight}`}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', outline: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { setGhostCursorMm(null); setDnGhostMarker(null); }}
        onContextMenu={handleRightClick}
        onKeyDown={(e) => {
          if (pieces.length === 0) return;
          const STEP = 5; // mm per arrow press
          if (e.key === 'Tab' && selectedPieceId) {
            // Only trap Tab when a piece is selected — otherwise let focus flow naturally
            e.preventDefault();
            const idx = pieces.findIndex(p => p.id === selectedPieceId);
            const next = e.shiftKey
              ? (idx <= 0 ? pieces.length - 1 : idx - 1)
              : (idx >= pieces.length - 1 ? 0 : idx + 1);
            onSelectPiece(pieces[next].id);
          } else if (e.key === 'Escape') {
            onSelectPiece(null);
          } else if (selectedPieceId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const piece = pieces.find(p => p.id === selectedPieceId);
            if (!piece) return;
            const dx = e.key === 'ArrowRight' ? STEP : e.key === 'ArrowLeft' ? -STEP : 0;
            const dy = e.key === 'ArrowDown' ? STEP : e.key === 'ArrowUp' ? -STEP : 0;
            const newX = Math.max(0, Math.min(CANVAS_WIDTH_MM, piece.x + dx));
            const newY = Math.max(0, Math.min(viewBoxHeight, piece.y + dy));
            dispatch({ type: 'EDIT_PIECE', id: selectedPieceId, changes: { x: newX, y: newY } });
          } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPieceId) {
            const piece = pieces.find(p => p.id === selectedPieceId);
            if (piece && !piece.locked) {
              dispatch({ type: 'DELETE_PIECE', id: selectedPieceId });
              onSelectPiece(null);
            }
          }
        }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="#55506A" />
          </marker>
          <marker id="arrowhead-ghost" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="#7028e0" opacity="0.5" />
          </marker>
        </defs>

        {/* Canvas background — subtle border and area indicator */}
        <rect
          x={0} y={0} width={CANVAS_WIDTH_MM} height={viewBoxHeight}
          fill="none" stroke="#E8E5F0" strokeWidth={0.5} rx={0}
          pointerEvents="none"
        />
        <rect
          x={2} y={2} width={CANVAS_WIDTH_MM - 4} height={viewBoxHeight - 4}
          fill="none" stroke="#F2F0F8" strokeWidth={0.3} rx={2}
          pointerEvents="none"
        />

        {/* 3.2: Suggested zones — visible only when enabled in settings */}
        {showSuggestedZones && (
        <g pointerEvents="none" opacity={(() => {
          const n = pieces.filter(p => !p.locked).length;
          if (n === 0) return 0.5;
          if (n < 3) return 0.4;
          return 0.12;
        })()}>
            {/* Top zone */}
            <rect
              x={15} y={viewBoxHeight * 0.08}
              width={CANVAS_WIDTH_MM - 30} height={viewBoxHeight * 0.48}
              fill="#F2F0F8"
              stroke="#B0BEC5" strokeWidth={1} strokeDasharray="6 4"
              rx={4}
            />
            <text
              x={CANVAS_WIDTH_MM / 2} y={viewBoxHeight * 0.08 + viewBoxHeight * 0.24}
              textAnchor="middle" dominantBaseline="central"
              fontSize={10} fill="#90A4AE" fontWeight={500}
            >
              Ton schéma
            </text>
            {/* Bottom zone */}
            <rect
              x={15} y={viewBoxHeight * 0.62}
              width={CANVAS_WIDTH_MM - 30} height={viewBoxHeight * 0.30}
              fill="#F2F0F8"
              stroke="#B0BEC5" strokeWidth={1} strokeDasharray="6 4"
              rx={4}
            />
            <text
              x={CANVAS_WIDTH_MM / 2} y={viewBoxHeight * 0.62 + viewBoxHeight * 0.15}
              textAnchor="middle" dominantBaseline="central"
              fontSize={10} fill="#90A4AE" fontWeight={500}
            >
              Calcul et réponse
            </text>
        </g>
        )}

        {/* Render pieces */}
        {/* Render boîtes first (background), then everything else on top */}
        {pieces.filter(p => p.type === 'boite').map(piece => {
          const isFaded = focusMode && piece.id !== selectedPieceId;
          return (
            <g key={piece.id} data-piece-id={piece.id} className={piece.id === lastPlacedId ? 'piece-new' : undefined}
              style={isFaded ? { opacity: 0.35, transition: 'opacity 0.4s ease-in-out' } : { transition: 'opacity 0.4s ease-in-out' }}>
              <PieceRenderer piece={piece} referenceUnitMm={referenceUnitMm} isSelected={piece.id === selectedPieceId} reponseIds={reponseIds} highContrast={highContrast} textScale={textScale} toleranceMultiplier={tolMultiplier} toolbarMode={toolbarMode}
                bondModeActive={bondMode?.pieceId === piece.id ? true : undefined}
                bondFromVal={bondMode?.pieceId === piece.id ? bondMode.fromVal : undefined}
                selectedBondIndex={selectedBondInfo?.pieceId === piece.id ? selectedBondInfo.bondIndex : undefined}
                hideLockBadge={hideLockBadge} />
            </g>
          );
        })}

        {/* Flèches rendered after all pieces — see end of SVG */}

        {/* B7: Étiquette attachment lines */}
        {pieces.filter(p => p.type === 'etiquette' && p.attachedTo).map(piece => {
          const etiq = piece as Piece & { type: 'etiquette' };
          const parent = pieces.find(p => p.id === etiq.attachedTo);
          if (!parent) return null;
          const pc = getPieceCenter(parent, referenceUnitMm);
          return (
            <line key={`attach-${piece.id}`}
              x1={piece.x} y1={piece.y}
              x2={pc.x} y2={pc.y}
              stroke="#D5D0E0" strokeWidth={0.3} strokeDasharray="2 1"
            />
          );
        })}

        {pieces.filter(p => p.type !== 'boite' && p.type !== 'fleche').map(piece => {
          const isMoving = mode.type === 'moving' && mode.pieceId === piece.id;
          const isFaded = focusMode && piece.id !== selectedPieceId;
          const opacity = isMoving ? 0.6 : isFaded ? 0.35 : 1;
          return (
            <g key={piece.id} data-piece-id={piece.id}
              className={piece.id === lastPlacedId ? 'piece-new' : undefined}
              style={{ opacity, transition: 'opacity 0.4s ease-in-out' }}
            >
              <PieceRenderer piece={piece} referenceUnitMm={referenceUnitMm} isSelected={piece.id === selectedPieceId} reponseIds={reponseIds} highContrast={highContrast} textScale={textScale} toleranceMultiplier={tolMultiplier} toolbarMode={toolbarMode}
                bondModeActive={bondMode?.pieceId === piece.id ? true : undefined}
                bondFromVal={bondMode?.pieceId === piece.id ? bondMode.fromVal : undefined}
                selectedBondIndex={selectedBondInfo?.pieceId === piece.id ? selectedBondInfo.bondIndex : undefined}
                hideLockBadge={hideLockBadge} />
            </g>
          );
        })}

        {/* Tableaux — rendered separately for in-place editing */}
        {pieces.filter(p => p.type === 'tableau').map(piece => {
          const isFaded = focusMode && piece.id !== selectedPieceId;
          return (
          <g key={piece.id} data-piece-id={piece.id}
            className={piece.id === lastPlacedId ? 'piece-new' : undefined}
            style={isFaded ? { opacity: 0.35, transition: 'opacity 0.4s ease-in-out' } : { transition: 'opacity 0.4s ease-in-out' }}>
            <TableauPiece
              piece={piece as Tableau}
              isSelected={piece.id === selectedPieceId}
              isEditing={tableauEditorPieceId === piece.id}
              previewRows={piece.id === selectedPieceId ? tableauPreviewRows : undefined}
              previewCols={piece.id === selectedPieceId ? tableauPreviewCols : undefined}
              activeRow={tableauEditorPieceId === piece.id ? activeCellRC?.row ?? null : null}
              activeCol={tableauEditorPieceId === piece.id ? activeCellRC?.col ?? null : null}
            />
          </g>
          );
        })}

        {/* Group brackets */}
        {(() => {
          const groups = new Map<string, Barre[]>();
          pieces.filter(isBarre).forEach(b => {
            if (b.groupId) {
              const list = groups.get(b.groupId) || [];
              list.push(b);
              groups.set(b.groupId, list);
            }
          });
          return Array.from(groups.entries()).map(([gid, bars]) => {
            if (bars.length < 2) return null;
            const minX = Math.min(...bars.map(b => b.x));
            const maxRight = Math.max(...bars.map(b => b.x + b.sizeMultiplier * referenceUnitMm));
            const maxY = Math.max(...bars.map(b => b.y + BAR_HEIGHT_MM));
            const bracketY = maxY + 3;
            const labelBar = bars.reduce((a, b) => a.y < b.y ? a : b);
            return (
              <g key={gid}>
                {/* Bracket — U shape with center tick */}
                <path d={`M${minX},${bracketY} L${minX},${bracketY + 4} L${maxRight},${bracketY + 4} L${maxRight},${bracketY}`}
                  fill="none" stroke="#7028e0" strokeWidth={1.2} strokeLinecap="round" />
                <line x1={(minX + maxRight) / 2} y1={bracketY + 4}
                  x2={(minX + maxRight) / 2} y2={bracketY + 7}
                  stroke="#7028e0" strokeWidth={1.2} strokeLinecap="round" />
                {labelBar.groupLabel ? (
                  <text x={(minX + maxRight) / 2} y={bracketY + 13} textAnchor="middle" fontSize={6} fontWeight={600} fill="#7028e0">
                    {labelBar.groupLabel}
                  </text>
                ) : (
                  <text x={(minX + maxRight) / 2} y={bracketY + 13} textAnchor="middle" fontSize={5} fill="#9898A8">
                    total
                  </text>
                )}
              </g>
            );
          });
        })()}

        {/* Flèches — rendered ON TOP of all pieces (hidden during arrange animation) */}
        {!isArranging && pieces.filter(p => p.type === 'fleche').map(piece => {
          const fleche = piece as Fleche;
          const fromPiece = pieces.find(p => p.id === fleche.fromId);
          const toPiece = pieces.find(p => p.id === fleche.toId);
          if (!fromPiece || !toPiece) return null;
          const fromCenter = getPieceCenter(fromPiece, referenceUnitMm);
          const toCenter = getPieceCenter(toPiece, referenceUnitMm);
          // Connect from edge of source to edge of target (not center-to-center)
          const fromEdge = getEdgePoint(fromPiece, toCenter, referenceUnitMm);
          const toEdge = getEdgePoint(toPiece, fromCenter, referenceUnitMm);
          // Arc curvature: lift above pieces proportional to distance
          const dx = toEdge.x - fromEdge.x;
          const dy = toEdge.y - fromEdge.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const arcHeight = Math.max(15, dist * 0.3);
          // Control point: midpoint shifted upward (perpendicular to the line)
          const midX = (fromEdge.x + toEdge.x) / 2;
          const midY = (fromEdge.y + toEdge.y) / 2;
          // Perpendicular direction (rotate 90° CCW), always curve upward
          const nx = -dy / dist;
          const ny = dx / dist;
          const cpX = midX + nx * arcHeight * (ny > 0 ? -1 : 1);
          const cpY = midY + ny * arcHeight * (ny > 0 ? -1 : 1);
          // Ensure control point goes upward (lower y)
          const finalCpY = Math.min(cpY, Math.min(fromEdge.y, toEdge.y) - arcHeight * 0.5);
          const finalCpX = cpY === finalCpY ? cpX : midX;
          const labelX = (fromEdge.x + 2 * finalCpX + toEdge.x) / 4;
          const labelY = (fromEdge.y + 2 * finalCpY + toEdge.y) / 4 - 3;
          const isSelected = selectedPieceId === piece.id;
          return (
            <g key={piece.id} data-piece-id={piece.id}>
              <path
                d={`M ${fromEdge.x} ${fromEdge.y} Q ${finalCpX} ${finalCpY} ${toEdge.x} ${toEdge.y}`}
                fill="none"
                stroke={isSelected ? '#7028e0' : '#55506A'}
                strokeWidth={isSelected ? 1.5 : 1}
                markerEnd="url(#arrowhead)"
              />
              {fleche.label && (
                <text x={labelX} y={labelY} textAnchor="middle" fontSize={4.5} fill="#1E1A2E"
                  data-edit-target={piece.id}>
                  {fleche.label}
                </text>
              )}
            </g>
          );
        })}
        {/* Alignment guide — temporary dotted line during bar snap */}
        {alignGuide && (
          <line
            x1={alignGuide.x} y1={alignGuide.y1 - 2}
            x2={alignGuide.x} y2={alignGuide.y2 + 2}
            stroke="#B0BEC5" strokeWidth={0.8} strokeDasharray="4 4"
            opacity={0.5} pointerEvents="none"
          />
        )}

        {/* Ghost: piece placement preview */}
        {ghostCursorMm && !arrowFromId && activeTool && activeTool !== 'deplacer' && activeTool !== 'fleche' && (
          <g pointerEvents="none" aria-hidden="true">
            {activeTool === 'droiteNumerique' && (() => {
              const gw = 200;
              const gx = ghostCursorMm.x - gw / 2;
              const gy = ghostCursorMm.y;
              return (
                <>
                  <line x1={gx} y1={gy} x2={gx + gw} y2={gy}
                    stroke="#7028e0" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
                  {/* Arrow tips */}
                  <polygon points={`${gx - 3},${gy} ${gx + 2},${gy - 2} ${gx + 2},${gy + 2}`}
                    fill="#7028e0" opacity={0.4} />
                  <polygon points={`${gx + gw + 3},${gy} ${gx + gw - 2},${gy - 2} ${gx + gw - 2},${gy + 2}`}
                    fill="#7028e0" opacity={0.4} />
                  {/* End ticks */}
                  <line x1={gx} y1={gy - 3} x2={gx} y2={gy + 3}
                    stroke="#7028e0" strokeWidth={0.5} opacity={0.4} />
                  <line x1={gx + gw} y1={gy - 3} x2={gx + gw} y2={gy + 3}
                    stroke="#7028e0" strokeWidth={0.5} opacity={0.4} />
                  <text x={gx + gw / 2} y={gy + 10} textAnchor="middle"
                    fontSize={4} fill="#7028e0" opacity={0.5}>
                    0 — 10
                  </text>
                </>
              );
            })()}
            {activeTool === 'tableau' && (() => {
              const tw = 3 * TABLEAU_CELL_W;
              const th = 2 * TABLEAU_CELL_H;
              const gx = ghostCursorMm.x - tw / 2;
              const gy = ghostCursorMm.y - th / 2;
              return (
                <>
                  <rect x={gx} y={gy} width={tw} height={th}
                    fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={0.8}
                    strokeDasharray="4 4" rx={1} />
                  {/* Header separator */}
                  <line x1={gx} y1={gy + TABLEAU_CELL_H} x2={gx + tw} y2={gy + TABLEAU_CELL_H}
                    stroke="#7028e0" strokeWidth={0.3} strokeDasharray="2 2" opacity={0.4} />
                  {/* Column separators */}
                  {[1, 2].map(c => (
                    <line key={`gc-${c}`}
                      x1={gx + c * TABLEAU_CELL_W} y1={gy}
                      x2={gx + c * TABLEAU_CELL_W} y2={gy + th}
                      stroke="#7028e0" strokeWidth={0.3} strokeDasharray="2 2" opacity={0.4} />
                  ))}
                  <text x={gx + tw / 2} y={gy + th + 6} textAnchor="middle"
                    fontSize={3.5} fill="#7028e0" opacity={0.5}>
                    3 × 2
                  </text>
                </>
              );
            })()}
            {/* Ghost: Arbre — root + 2 branches + 2 children (R13: real size, opacity ≥ 0.35) */}
            {activeTool === 'arbre' && (() => {
              const gx = ghostCursorMm.x;
              const gy = ghostCursorMm.y;
              return (
                <>
                  <circle cx={gx} cy={gy - 15} r={5} fill="none" stroke="#7028e0" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
                  <line x1={gx} y1={gy - 10} x2={gx - 20} y2={gy + 10} stroke="#7028e0" strokeWidth={0.6} strokeDasharray="3 3" opacity={0.35} />
                  <line x1={gx} y1={gy - 10} x2={gx + 20} y2={gy + 10} stroke="#7028e0" strokeWidth={0.6} strokeDasharray="3 3" opacity={0.35} />
                  <circle cx={gx - 20} cy={gy + 13} r={5} fill="none" stroke="#7028e0" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
                  <circle cx={gx + 20} cy={gy + 13} r={5} fill="none" stroke="#7028e0" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
                  <text x={gx} y={gy + 24} textAnchor="middle" fontSize={3.5} fill="#7028e0" opacity={0.5}>
                    2 × 2
                  </text>
                </>
              );
            })()}
            {/* Ghost: Schema — bar with bracket (R13: real size) */}
            {activeTool === 'schema' && (() => {
              const gw = 2 * referenceUnitMm; // R13: real size ghost
              const gh = 15;
              const gx = ghostCursorMm.x - gw / 2;
              const gy = ghostCursorMm.y - gh / 2;
              return (
                <>
                  <rect x={gx} y={gy} width={gw} height={gh} rx={1.5}
                    fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={0.8}
                    strokeDasharray="4 4" opacity={0.4} />
                  {/* Bracket below */}
                  <path d={`M${gx},${gy + gh + 2} L${gx},${gy + gh + 5} L${gx + gw},${gy + gh + 5} L${gx + gw},${gy + gh + 2}`}
                    stroke="#7028e0" strokeWidth={0.5} fill="none" opacity={0.35} />
                  <text x={gx + gw / 2} y={gy + gh + 10} textAnchor="middle"
                    fontSize={3.5} fill="#7028e0" opacity={0.5}>
                    schéma
                  </text>
                </>
              );
            })()}
            {/* Ghost: Jeton — small circle */}
            {activeTool === 'jeton' && (
              <circle cx={ghostCursorMm.x} cy={ghostCursorMm.y} r={5}
                fill="rgba(112, 40, 224, 0.1)" stroke="#7028e0" strokeWidth={0.8}
                strokeDasharray="3 3" opacity={0.4} />
            )}
            {/* Ghost: Boîte — dashed container */}
            {activeTool === 'boite' && (
              <rect x={ghostCursorMm.x} y={ghostCursorMm.y} width={60} height={40} rx={2}
                fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={0.8}
                strokeDasharray="3 2" opacity={0.4} />
            )}
            {/* Ghost: Barre — horizontal bar */}
            {activeTool === 'barre' && (
              <rect x={ghostCursorMm.x} y={ghostCursorMm.y}
                width={referenceUnitMm} height={BAR_HEIGHT_MM} rx={1}
                fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={0.8}
                strokeDasharray="4 4" opacity={0.4} />
            )}
            {/* Ghost: Calcul — code-style rect */}
            {activeTool === 'calcul' && (
              <>
                <rect x={ghostCursorMm.x} y={ghostCursorMm.y} width={80} height={20} rx={3}
                  fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={0.8}
                  strokeDasharray="4 4" opacity={0.4} />
                <text x={ghostCursorMm.x + 6} y={ghostCursorMm.y + 10}
                  dominantBaseline="central" fontSize={8}
                  fontFamily="'Consolas', 'Courier New', monospace"
                  fill="#7028e0" opacity={0.35}>
                  …
                </text>
              </>
            )}
            {/* Ghost: Réponse — answer box */}
            {activeTool === 'reponse' && (
              <>
                <rect x={ghostCursorMm.x} y={ghostCursorMm.y} width={100} height={26} rx={3}
                  fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={0.8}
                  strokeDasharray="4 4" opacity={0.4} />
                <text x={ghostCursorMm.x + 6} y={ghostCursorMm.y + 9}
                  fontSize={5} fill="#7028e0" opacity={0.35}>
                  Réponse
                </text>
              </>
            )}
            {/* Ghost: Étiquette — small label */}
            {activeTool === 'etiquette' && (
              <rect x={ghostCursorMm.x - 2} y={ghostCursorMm.y - 7} width={30} height={10} rx={1.5}
                fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={0.8}
                strokeDasharray="3 3" opacity={0.4} />
            )}
            {/* Ghost: Inconnue — circle with ? */}
            {activeTool === 'inconnue' && (
              <>
                <circle cx={ghostCursorMm.x} cy={ghostCursorMm.y} r={6}
                  fill="rgba(112, 40, 224, 0.08)" stroke="#7028e0" strokeWidth={0.8}
                  strokeDasharray="3 3" opacity={0.4} />
                <text x={ghostCursorMm.x} y={ghostCursorMm.y}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={8} fontWeight="700" fill="#7028e0" opacity={0.4}>
                  ?
                </text>
              </>
            )}
            {/* Ghost: Diagramme à bandes */}
            {activeTool === 'diagrammeBandes' && (() => {
              const gw = 120, gh = 90;
              const gx = ghostCursorMm.x - gw / 2;
              const gy = ghostCursorMm.y - gh / 2;
              return (
                <>
                  <rect x={gx} y={gy} width={gw} height={gh} rx={2}
                    fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={0.8}
                    strokeDasharray="4 4" opacity={0.4} />
                  <rect x={gx + 25} y={gy + 40} width={15} height={30} fill="#7028e0" opacity={0.1} />
                  <rect x={gx + 50} y={gy + 25} width={15} height={45} fill="#7028e0" opacity={0.1} />
                  <rect x={gx + 75} y={gy + 50} width={15} height={20} fill="#7028e0" opacity={0.1} />
                  <text x={gx + gw / 2} y={gy + gh + 6} textAnchor="middle"
                    fontSize={3.5} fill="#7028e0" opacity={0.5}>
                    bandes
                  </text>
                </>
              );
            })()}
            {/* Ghost: Diagramme à ligne brisée */}
            {activeTool === 'diagrammeLigne' && (() => {
              const gw = 120, gh = 90;
              const gx = ghostCursorMm.x - gw / 2;
              const gy = ghostCursorMm.y - gh / 2;
              return (
                <>
                  <rect x={gx} y={gy} width={gw} height={gh} rx={2}
                    fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={0.8}
                    strokeDasharray="4 4" opacity={0.4} />
                  <polyline points={`${gx + 25},${gy + 55} ${gx + 55},${gy + 35} ${gx + 85},${gy + 60}`}
                    fill="none" stroke="#7028e0" strokeWidth={1} opacity={0.15} />
                  <circle cx={gx + 25} cy={gy + 55} r={2} fill="#7028e0" opacity={0.15} />
                  <circle cx={gx + 55} cy={gy + 35} r={2} fill="#7028e0" opacity={0.15} />
                  <circle cx={gx + 85} cy={gy + 60} r={2} fill="#7028e0" opacity={0.15} />
                  <text x={gx + gw / 2} y={gy + gh + 6} textAnchor="middle"
                    fontSize={3.5} fill="#7028e0" opacity={0.5}>
                    ligne brisée
                  </text>
                </>
              );
            })()}
          </g>
        )}

        {/* Ghost: marker preview on droiteNumerique */}
        {dnGhostMarker && (() => {
          const dn = pieces.find(p => p.id === dnGhostMarker.pieceId) as DroiteNumerique | undefined;
          if (!dn) return null;
          return (
            <g pointerEvents="none" aria-hidden="true">
              {dnGhostMarker.isRemoval ? (
                // Removal indicator: X over existing marker
                <g>
                  <line x1={dnGhostMarker.xMm - 3} y1={dn.y - 3}
                    x2={dnGhostMarker.xMm + 3} y2={dn.y + 3}
                    stroke="#C82828" strokeWidth={1.2} opacity={0.5} />
                  <line x1={dnGhostMarker.xMm + 3} y1={dn.y - 3}
                    x2={dnGhostMarker.xMm - 3} y2={dn.y + 3}
                    stroke="#C82828" strokeWidth={1.2} opacity={0.5} />
                </g>
              ) : (
                // Add indicator: ghost circle + label
                <g>
                  <circle cx={dnGhostMarker.xMm} cy={dn.y} r={4}
                    fill="rgba(24, 95, 165, 0.4)" stroke="#185FA5" strokeWidth={0.5}
                    strokeDasharray="2 1" />
                  <text x={dnGhostMarker.xMm} y={dn.y - 6} textAnchor="middle"
                    fontSize={4.5} fontWeight={600} fill="#185FA5" opacity={0.5}>
                    {dnGhostMarker.val}
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        {/* Ghost: bond arc preview during bond creation */}
        {dnGhostBond && (() => {
          return (
            <g pointerEvents="none" aria-hidden="true">
              <path d={dnGhostBond.path} fill="none"
                stroke="#185FA5" strokeWidth={1.2}
                strokeDasharray="3,2" opacity={0.4} />
              {toolbarMode === 'complet' && dnGhostBond.label && (
                <text x={dnGhostBond.midX} y={dnGhostBond.labelY}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={6} fontWeight={600}
                  fill="#185FA5" opacity={0.4}>
                  {dnGhostBond.label}
                </text>
              )}
            </g>
          );
        })()}

        {/* Ghost: arrow line from source to cursor/target */}
        {arrowFromId && ghostCursorMm && (() => {
          const fromPiece = pieces.find(p => p.id === arrowFromId);
          if (!fromPiece) return null;
          const fromBounds = getPieceBounds(fromPiece, referenceUnitMm, 2, textScale);
          const fromEdge = getEdgePoint(fromPiece, ghostCursorMm, referenceUnitMm);

          // Determine target: snap to hovered piece edge, or use cursor
          let targetPoint = ghostCursorMm;
          let snapToTarget = false;
          if (hoveredPieceId && hoveredPieceId !== arrowFromId) {
            const targetPiece = pieces.find(p => p.id === hoveredPieceId);
            if (targetPiece && targetPiece.type !== 'fleche') {
              const fromCenter = getPieceCenter(fromPiece, referenceUnitMm);
              targetPoint = getEdgePoint(targetPiece, fromCenter, referenceUnitMm);
              snapToTarget = true;
            }
          }

          const dx = targetPoint.x - fromEdge.x;
          const dy = targetPoint.y - fromEdge.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 2) return null;

          return (
            <g pointerEvents="none" aria-hidden="true">
              {/* Source highlight */}
              <rect x={fromBounds.x} y={fromBounds.y} width={fromBounds.w} height={fromBounds.h} rx={3}
                fill="rgba(112, 40, 224, 0.08)" stroke="#7028e0" strokeWidth={1}
                strokeDasharray="3 2" />
              {/* Ghost line */}
              <line x1={fromEdge.x} y1={fromEdge.y} x2={targetPoint.x} y2={targetPoint.y}
                stroke="#7028e0" strokeWidth={1} strokeDasharray="4 4" opacity={0.5}
                markerEnd="url(#arrowhead-ghost)" />
              {/* Target snap indicator */}
              {snapToTarget && (() => {
                const tb = getPieceBounds(pieces.find(p => p.id === hoveredPieceId)!, referenceUnitMm, 2, textScale);
                return (
                  <rect x={tb.x} y={tb.y} width={tb.w} height={tb.h} rx={3}
                    fill="rgba(112, 40, 224, 0.08)" stroke="#7028e0" strokeWidth={1}
                    strokeDasharray="3 2" />
                );
              })()}
            </g>
          );
        })()}
      </svg>

      {/* Inline editor overlay (HTML, not foreignObject) */}
      {editingPieceId && (() => {
        const piece = pieces.find(p => p.id === editingPieceId);
        if (!piece) return null;

        const svgEl = svgRef.current;
        if (!svgEl) return null;
        const ctm = svgEl.getScreenCTM();
        if (!ctm) return null;
        const canvasRect = containerRef.current?.getBoundingClientRect();
        if (!canvasRect) return null;

        // Calculate mm-to-px ratio from the SVG transform
        const mmToPx = ctm.a; // scale factor from viewBox mm to screen px

        // Determine what we're editing based on piece type and editingField
        let initialValue = '';
        let placeholder = '';
        let fieldKey = '';
        let editorLeft: number;
        let editorTop: number;
        let svgFontSizeMm = 7;

        // Determine field to edit
        if (piece.type === 'calcul') {
          initialValue = piece.expression;
          placeholder = '5 + 3 = 8';
          fieldKey = 'expression';
          svgFontSizeMm = 8;
        } else if (piece.type === 'reponse') {
          initialValue = piece.text;
          if (piece.template) {
            // Template mode: show blank count hint in placeholder
            const blankCount = (piece.template.match(/___/g) || []).length;
            placeholder = blankCount > 1
              ? `Remplis les ${blankCount} trous (séparés par |)`
              : 'Remplis le trou';
          } else {
            placeholder = 'Ta réponse...';
          }
          fieldKey = 'text';
          svgFontSizeMm = 7;
        } else if (piece.type === 'barre' && editingBarField === 'value') {
          initialValue = piece.value;
          placeholder = 'Valeur (ex: 45, ?)';
          fieldKey = 'value';
          svgFontSizeMm = 6;
        } else if (piece.type === 'barre') {
          initialValue = piece.label;
          placeholder = 'Nom (ex: Théo)';
          fieldKey = 'label';
        } else if (piece.type === 'boite' && editingBarField === 'value') {
          initialValue = piece.value;
          placeholder = 'Nombre...';
          fieldKey = 'value';
          svgFontSizeMm = 8;
        } else if (piece.type === 'boite') {
          initialValue = piece.label;
          placeholder = 'Nom (ex: Ami 1)';
          fieldKey = 'label';
          svgFontSizeMm = 4.5;
        } else if (piece.type === 'etiquette') {
          initialValue = piece.text;
          placeholder = 'Texte...';
          fieldKey = 'text';
          svgFontSizeMm = 7;
        } else if (piece.type === 'fleche') {
          initialValue = piece.label;
          placeholder = 'Texte de la flèche...';
          fieldKey = 'label';
          svgFontSizeMm = 5;
        } else if (piece.type === 'arbre' && editingArbreField) {
          const arbre = piece as Arbre;
          if (editingArbreField.type === 'node') {
            const { levelIndex, optionIndex } = editingArbreField;
            initialValue = arbre.levels[levelIndex]?.options[optionIndex] ?? '';
            placeholder = 'Ex: Soupe, Rouge...';
            fieldKey = `__arbre_node_${levelIndex}_${optionIndex}`;
            svgFontSizeMm = 7; // T1
          } else {
            const { levelIndex } = editingArbreField;
            initialValue = arbre.levels[levelIndex]?.name ?? '';
            placeholder = 'Ex: Entrée, Plat...';
            fieldKey = `__arbre_level_${levelIndex}`;
            svgFontSizeMm = 6; // T2
          }
        } else if (piece.type === 'schema' && editingSchemaField) {
          const schema = piece as Schema;
          if (editingSchemaField.type === 'bar-label') {
            initialValue = schema.bars[editingSchemaField.barIndex]?.label ?? '';
            placeholder = 'Nom (ex: Théo)';
            fieldKey = `__schema_bar_${editingSchemaField.barIndex}_label`;
            svgFontSizeMm = 6;
          } else if (editingSchemaField.type === 'part-label') {
            const { barIndex, partIndex } = editingSchemaField;
            initialValue = schema.bars[barIndex]?.parts[partIndex]?.label ?? '';
            placeholder = 'Partie...';
            fieldKey = `__schema_part_${barIndex}_${partIndex}_label`;
            svgFontSizeMm = 6;
          } else if (editingSchemaField.type === 'total') {
            initialValue = schema.totalLabel ?? '';
            placeholder = 'Total...';
            fieldKey = '__schema_total';
            svgFontSizeMm = 6;
          } else if (editingSchemaField.type === 'diff') {
            initialValue = schema.totalLabel ?? '';
            placeholder = 'Différence...';
            fieldKey = '__schema_diff';
            svgFontSizeMm = 6;
          } else if (editingSchemaField.type === 'bar-value') {
            const val = schema.bars[editingSchemaField.barIndex]?.value;
            initialValue = val != null ? String(val) : '';
            placeholder = '?';
            fieldKey = `__schema_bar_${editingSchemaField.barIndex}_value`;
            svgFontSizeMm = 7;
          } else if (editingSchemaField.type === 'part-value') {
            const { barIndex, partIndex } = editingSchemaField;
            const val = schema.bars[barIndex]?.parts[partIndex]?.value;
            initialValue = val != null ? String(val) : '';
            placeholder = '?';
            fieldKey = `__schema_part_${barIndex}_${partIndex}_value`;
            svgFontSizeMm = 7;
          }
        } else if (piece.type === 'diagrammeBandes' || piece.type === 'diagrammeLigne') {
          initialValue = (piece as any).title ?? '';
          placeholder = 'Titre du diagramme...';
          fieldKey = 'title';
          svgFontSizeMm = 5.5;
        } else {
          return null;
        }

        // Position editor by querying the actual rendered SVG text element.
        // data-edit-target attributes: pieceId for direct text, pieceId-suffix for multi-field pieces.
        let editTargetId: string;
        if (piece.type === 'barre' || piece.type === 'boite') {
          editTargetId = `${piece.id}-${editingBarField || 'label'}`;
        } else if (piece.type === 'arbre' && editingArbreField) {
          editTargetId = editingArbreField.type === 'node'
            ? `${piece.id}-node-${editingArbreField.nodeIndex}`
            : `${piece.id}-level-${editingArbreField.levelIndex}`;
        } else if (piece.type === 'schema' && editingSchemaField) {
          if (editingSchemaField.type === 'bar-label') {
            editTargetId = `${piece.id}-bar-${editingSchemaField.barIndex}-label`;
          } else if (editingSchemaField.type === 'bar-value') {
            editTargetId = `${piece.id}-bar-${editingSchemaField.barIndex}-value`;
          } else if (editingSchemaField.type === 'part-label') {
            editTargetId = `${piece.id}-part-${editingSchemaField.barIndex}-${editingSchemaField.partIndex}-label`;
          } else if (editingSchemaField.type === 'part-value') {
            editTargetId = `${piece.id}-part-${editingSchemaField.barIndex}-${editingSchemaField.partIndex}-value`;
          } else {
            editTargetId = `${piece.id}-${editingSchemaField.type}`;
          }
        } else {
          editTargetId = piece.id;
        }
        const targetEl = svgEl.querySelector(`[data-edit-target="${editTargetId}"]`);
        const targetRect = targetEl?.getBoundingClientRect();

        // Determine editor dimensions based on piece type
        const isArbreNode = piece.type === 'arbre' && editingArbreField?.type === 'node';
        const isArbreLevel = piece.type === 'arbre' && editingArbreField?.type === 'level';

        if (targetRect && targetRect.width > 0) {
          // Position editor aligned with the SVG element
          const isRightAligned = piece.type === 'barre' && editingBarField !== 'value';
          if (isRightAligned) {
            editorLeft = targetRect.right - canvasRect.left - 200;
          } else {
            // Align with target element left edge (arbre nodes: rect left edge)
            editorLeft = targetRect.left - canvasRect.left;
          }
          // Vertically align with target element
          const editorH = isArbreNode ? targetRect.height : Math.max(28, svgFontSizeMm * mmToPx * 1.8);
          editorTop = (isArbreNode ? targetRect.top - canvasRect.top : (targetRect.top + targetRect.bottom) / 2 - canvasRect.top - editorH / 2);
        } else {
          // Fallback: use SVG transform (new piece with no rendered text yet)
          let fallbackX = piece.x;
          let fallbackY = piece.y;
          if (piece.type === 'fleche') {
            const fromP = pieces.find(p => p.id === piece.fromId);
            const toP = pieces.find(p => p.id === piece.toId);
            if (fromP && toP) {
              const fc = getPieceCenter(fromP, referenceUnitMm);
              const tc = getPieceCenter(toP, referenceUnitMm);
              fallbackX = (fc.x + tc.x) / 2;
              fallbackY = (fc.y + tc.y) / 2;
            }
          }
          const pt = new DOMPoint(fallbackX, fallbackY).matrixTransform(ctm);
          editorLeft = pt.x - canvasRect.left;
          editorTop = pt.y - canvasRect.top;
        }

        const isCalcul = piece.type === 'calcul';

        // Piece-matched editor — overlay exactly on piece visual area
        const pieceBorderRadius = Math.round(3 * mmToPx);
        let editorMinWidth = 200;
        let editorFixedHeight: number | undefined;
        let editorPaddingLeft: number | undefined;
        let editorTextAlign: 'center' | 'left' | 'right' | undefined;
        let editorFontWeight: number | string | undefined;
        let editorFixedWidth = false;

        // Helper: set editor to match an SVG rect (in mm) via CTM
        const overlayOnBounds = (bx: number, by: number, bw: number, bh: number) => {
          const tl = new DOMPoint(bx, by).matrixTransform(ctm);
          const br = new DOMPoint(bx + bw, by + bh).matrixTransform(ctm);
          editorLeft = tl.x - canvasRect.left;
          editorTop = tl.y - canvasRect.top;
          editorMinWidth = Math.max(60, Math.round(br.x - tl.x));
          editorFixedHeight = Math.round(br.y - tl.y);
          editorFixedWidth = true;
        };

        if (isArbreNode && targetRect) {
          editorMinWidth = targetRect.width;
        } else if (isArbreLevel) {
          editorMinWidth = 150;
        } else if (isCalcul) {
          const b = getPieceBounds(piece, referenceUnitMm, 0, textScale);
          overlayOnBounds(b.x, b.y, b.w, b.h);
          editorPaddingLeft = Math.round(6 * mmToPx);
          editorFontWeight = 'normal';
        } else if (piece.type === 'reponse') {
          const b = getPieceBounds(piece, referenceUnitMm, 0, textScale);
          overlayOnBounds(b.x, b.y, b.w, b.h);
          editorPaddingLeft = Math.round(6 * mmToPx);
          editorFontWeight = 'normal';
        } else if (piece.type === 'etiquette') {
          const b = getPieceBounds(piece, referenceUnitMm, 0, textScale);
          overlayOnBounds(b.x, b.y, b.w, b.h);
          editorPaddingLeft = Math.round(2 * mmToPx);
          editorFontWeight = 'normal';
        } else if (piece.type === 'barre' && editingBarField === 'value') {
          // Overlay on bar rect, centered text
          const bw = (piece as Barre).sizeMultiplier * referenceUnitMm;
          overlayOnBounds(piece.x, piece.y, bw, BAR_HEIGHT_MM);
          editorTextAlign = 'center';
          editorFontWeight = 600;
        } else if (piece.type === 'barre') {
          // Label left of bar — overlay on bar rect height, ending at bar left edge
          const barH = BAR_HEIGHT_MM;
          const labelW = Math.max(40, (piece as Barre).label.length * 6 + 16);
          overlayOnBounds(piece.x - labelW - 4, piece.y, labelW, barH);
          editorTextAlign = 'right';
          editorFontWeight = 'normal';
        } else if (piece.type === 'boite' && editingBarField === 'value') {
          // Overlay on boite rect, centered text
          overlayOnBounds(piece.x, piece.y, (piece as Boite).width, (piece as Boite).height);
          editorTextAlign = 'center';
          editorFontWeight = 600;
        } else if (piece.type === 'boite') {
          // Label above boite — editor spans box width above it
          overlayOnBounds(piece.x, piece.y - 10, (piece as Boite).width, 10);
          editorPaddingLeft = Math.round(4 * mmToPx);
          editorFontWeight = 'normal';
        } else if (piece.type === 'fleche') {
          // Position at arrow midpoint — use targetRect if available, else fallback
          if (targetRect && targetRect.width > 0) {
            editorMinWidth = Math.max(80, targetRect.width + 20);
            editorFixedWidth = true;
          }
          editorFontWeight = 'normal';
        } else if (piece.type === 'schema' && editingSchemaField) {
          const schemaLayout = computePartLayout(piece as Schema, referenceUnitMm);
          if (editingSchemaField.type === 'bar-label') {
            const bar = schemaLayout.bars[editingSchemaField.barIndex];
            if (bar) {
              const labelW = Math.max(40, (piece as Schema).bars[editingSchemaField.barIndex]?.label?.length * 6 + 16 || 40);
              overlayOnBounds(piece.x + bar.x - labelW - 4, piece.y + bar.y, labelW, bar.height);
              editorTextAlign = 'right';
            }
          } else if (editingSchemaField.type === 'part-label') {
            const part = schemaLayout.parts.find(p =>
              p.barIndex === editingSchemaField.barIndex && p.partIndex === editingSchemaField.partIndex
            );
            if (part) {
              const pw = Math.max(15, part.width); // min 15mm for narrow parts
              overlayOnBounds(piece.x + part.x, piece.y + part.y - 8, pw, 8);
              editorTextAlign = 'center';
              editorMinWidth = Math.max(80, editorMinWidth); // min 80px for narrow parts (ergo TDC)
            }
          } else if (editingSchemaField.type === 'bar-value') {
            const bar = schemaLayout.bars[editingSchemaField.barIndex];
            if (bar) {
              overlayOnBounds(piece.x + bar.x, piece.y + bar.y, bar.width, bar.height);
              editorTextAlign = 'center';
              editorFontWeight = 600;
            }
          } else if (editingSchemaField.type === 'part-value') {
            const part = schemaLayout.parts.find(p =>
              p.barIndex === editingSchemaField.barIndex && p.partIndex === editingSchemaField.partIndex
            );
            if (part) {
              overlayOnBounds(piece.x + part.x, piece.y + part.y, part.width, part.height);
              editorTextAlign = 'center';
              editorFontWeight = 600;
              editorMinWidth = Math.max(80, editorMinWidth);
            }
          } else if (editingSchemaField.type === 'total' && schemaLayout.totalBracket) {
            const tb = schemaLayout.totalBracket;
            const barW = schemaLayout.bars[0]?.width ?? 60;
            overlayOnBounds(piece.x, piece.y + tb.y + 4, barW, tb.height - 4);
            editorTextAlign = 'center';
          } else if (editingSchemaField.type === 'diff' && schemaLayout.differenceBracket) {
            const db = schemaLayout.differenceBracket;
            overlayOnBounds(piece.x + db.x + 6, piece.y + db.y, 30, db.height);
          }
          editorFontWeight = 'normal';
        } else if (piece.type === 'diagrammeBandes' || piece.type === 'diagrammeLigne') {
          // Title above diagram — width of piece
          const pw = (piece as DiagrammeBandes).width || 120;
          overlayOnBounds(piece.x, piece.y - 8, pw, 8);
          editorFontWeight = 'normal';
        }

        // Clamp after repositioning
        editorLeft = Math.max(8, editorLeft);
        editorTop = Math.max(8, Math.min(editorTop, canvasRect.height - (isCalcul ? 100 : 40) - 8));

        return (
          <InlineEditor
            key={editingPieceId + fieldKey}
            left={editorLeft}
            top={editorTop}
            initialValue={initialValue}
            placeholder={placeholder}
            isCalcul={isCalcul}
            monospace={isCalcul}
            fontSize={svgFontSizeMm * textScale * mmToPx}
            maxLength={piece.type === 'arbre' ? (editingArbreField?.type === 'node' ? 20 : 30) : undefined}
            minWidth={editorMinWidth}
            fixedHeight={isArbreNode && targetRect ? targetRect.height : editorFixedHeight}
            textAlign={isArbreNode ? 'center' : editorTextAlign}
            compact={isArbreNode}
            fixedWidth={editorFixedWidth}
            borderRadiusPx={pieceBorderRadius}
            paddingLeftPx={editorPaddingLeft}
            fontWeight={editorFontWeight}
            onCommit={(value) => {
              if (piece.type === 'arbre' && editingArbreField) {
                const arbre = piece as Arbre;
                const newLevels = editingArbreField.type === 'node'
                  ? arbre.levels.map((l, i) => i === editingArbreField.levelIndex
                    ? { ...l, options: l.options.map((o, j) => j === editingArbreField.optionIndex ? value : o) } : l)
                  : arbre.levels.map((l, i) => i === editingArbreField.levelIndex ? { ...l, name: value } : l);
                dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { levels: newLevels } });
              } else if (piece.type === 'schema' && editingSchemaField) {
                const schema = piece as Schema;
                if (editingSchemaField.type === 'bar-label') {
                  const newBars = schema.bars.map((b, i) =>
                    i === editingSchemaField.barIndex ? { ...b, label: value } : b
                  );
                  dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { bars: newBars } });
                } else if (editingSchemaField.type === 'part-label') {
                  const { barIndex, partIndex } = editingSchemaField;
                  const newBars = schema.bars.map((b, i) =>
                    i === barIndex ? { ...b, parts: b.parts.map((p, j) =>
                      j === partIndex ? { ...p, label: value } : p) } : b
                  );
                  dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { bars: newBars } });
                } else if (editingSchemaField.type === 'bar-value') {
                  const numVal = value === '' ? null : Number(value);
                  const newBars = schema.bars.map((b, i) =>
                    i === editingSchemaField.barIndex ? { ...b, value: isNaN(numVal as number) ? null : numVal } : b
                  );
                  dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { bars: newBars } });
                } else if (editingSchemaField.type === 'part-value') {
                  const { barIndex, partIndex } = editingSchemaField;
                  const numVal = value === '' ? null : Number(value);
                  const newBars = schema.bars.map((b, i) =>
                    i === barIndex ? { ...b, parts: b.parts.map((p, j) =>
                      j === partIndex ? { ...p, value: isNaN(numVal as number) ? null : numVal } : p) } : b
                  );
                  dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { bars: newBars } });
                } else if (editingSchemaField.type === 'total' || editingSchemaField.type === 'diff') {
                  dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { totalLabel: value } });
                }
              } else {
                dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { [fieldKey]: value } });
              }
              if (piece.type === 'reponse' && value.length > 0) onAcknowledge();
              setEditingArbreField(null);
              setEditingSchemaField(null);
              onStopEdit();
            }}
            onTab={piece.type === 'arbre' && editingArbreField?.type === 'node' ? (value) => {
              // Commit current node, then advance to next empty node in layout order
              const arbre = piece as Arbre;
              const { levelIndex, optionIndex, nodeIndex } = editingArbreField;
              const newLevels = arbre.levels.map((l, i) =>
                i === levelIndex ? { ...l, options: l.options.map((o, j) => j === optionIndex ? value : o) } : l
              );
              dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { levels: newLevels } });
              // Find next empty node in layout order (wraps around)
              const layout = computeTreeLayout(newLevels);
              const nodes = layout.nodes;
              let nextField: { type: 'node'; levelIndex: number; optionIndex: number; nodeIndex: number } | null = null;
              for (let offset = 1; offset < nodes.length; offset++) {
                const ni = (nodeIndex + offset) % nodes.length;
                const n = nodes[ni];
                if (!newLevels[n.levelIndex].options[n.optionIndex]) {
                  nextField = { type: 'node', levelIndex: n.levelIndex, optionIndex: n.optionIndex, nodeIndex: ni };
                  break;
                }
              }
              if (nextField) {
                setEditingArbreField(nextField);
              } else {
                setEditingArbreField(null);
                onStopEdit();
              }
            } : piece.type === 'schema' && editingSchemaField ? (value) => {
              // Commit current schema field, then advance to next empty label
              const schema = piece as Schema;
              let newBars = schema.bars;
              if (editingSchemaField.type === 'bar-label') {
                newBars = schema.bars.map((b, i) =>
                  i === editingSchemaField.barIndex ? { ...b, label: value } : b
                );
              } else if (editingSchemaField.type === 'bar-value') {
                const numVal = value === '' ? null : Number(value);
                newBars = schema.bars.map((b, i) =>
                  i === editingSchemaField.barIndex ? { ...b, value: isNaN(numVal as number) ? null : numVal } : b
                );
              } else if (editingSchemaField.type === 'part-label') {
                const { barIndex, partIndex } = editingSchemaField;
                newBars = schema.bars.map((b, i) =>
                  i === barIndex ? { ...b, parts: b.parts.map((p, j) =>
                    j === partIndex ? { ...p, label: value } : p) } : b
                );
              } else if (editingSchemaField.type === 'part-value') {
                const { barIndex, partIndex } = editingSchemaField;
                const numVal = value === '' ? null : Number(value);
                newBars = schema.bars.map((b, i) =>
                  i === barIndex ? { ...b, parts: b.parts.map((p, j) =>
                    j === partIndex ? { ...p, value: isNaN(numVal as number) ? null : numVal } : p) } : b
                );
              } else if (editingSchemaField.type === 'total' || editingSchemaField.type === 'diff') {
                dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { totalLabel: value } });
                setEditingSchemaField(null);
                onStopEdit();
                return;
              }
              dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { bars: newBars } });

              // Build ordered list of all editable fields, find next empty one
              type SchemaField = typeof editingSchemaField;
              const allFields: SchemaField[] = [];
              for (let bi = 0; bi < newBars.length; bi++) {
                allFields.push({ type: 'bar-label', barIndex: bi });
                for (let pi = 0; pi < newBars[bi].parts.length; pi++) {
                  allFields.push({ type: 'part-label', barIndex: bi, partIndex: pi });
                }
              }
              // Find current position
              const curIdx = allFields.findIndex(f => {
                if (!f || !editingSchemaField) return false;
                if (f.type !== editingSchemaField.type) return false;
                if (f.type === 'bar-label' && editingSchemaField.type === 'bar-label') return f.barIndex === editingSchemaField.barIndex;
                if (f.type === 'part-label' && editingSchemaField.type === 'part-label') return f.barIndex === editingSchemaField.barIndex && f.partIndex === editingSchemaField.partIndex;
                return false;
              });
              // Find next empty field (wrap around)
              let nextField: SchemaField = null;
              for (let offset = 1; offset < allFields.length; offset++) {
                const fi = (curIdx + offset) % allFields.length;
                const f = allFields[fi];
                if (!f) continue;
                if (f.type === 'bar-label' && !newBars[f.barIndex].label) {
                  nextField = f;
                  break;
                }
                if (f.type === 'part-label' && !newBars[f.barIndex].parts[f.partIndex]?.label) {
                  nextField = f;
                  break;
                }
              }
              if (nextField) {
                setEditingSchemaField(nextField);
              } else {
                setEditingSchemaField(null);
                onStopEdit();
              }
            } : undefined}
            onCancel={() => { setEditingArbreField(null); setEditingSchemaField(null); onStopEdit(); }}
            onColumnCalc={piece.type === 'calcul' ? () => {
              onStopEdit();
              setColumnCalcPieceId(editingPieceId);
            } : undefined}
            onDivisionCalc={piece.type === 'calcul' ? () => {
              onStopEdit();
              setDivisionCalcPieceId(editingPieceId);
            } : undefined}
          />
        );
      })()}

      {/* Context actions — hidden during bond mode to avoid intercepting canvas clicks */}
      {selectedPiece && mode.type === 'idle' && !editingPieceId && !bondMode && (
        <ContextActions
          piece={selectedPiece}
          canvasRect={containerRef.current?.getBoundingClientRect() ?? null}
          svgElement={svgRef.current}
          referenceUnitMm={referenceUnitMm}
          onStartEdit={onStartEdit}
          onStartEditLabel={(id) => {
            const p = pieces.find(p => p.id === id);
            if (p?.type === 'schema') {
              const schema = p as Schema;
              // Target first empty label: bar labels first, then part labels
              const emptyBarIdx = schema.bars.findIndex(b => !b.label);
              if (emptyBarIdx >= 0) {
                setEditingSchemaField({ type: 'bar-label', barIndex: emptyBarIdx });
              } else {
                let found = false;
                for (let bi = 0; bi < schema.bars.length && !found; bi++) {
                  const pi = schema.bars[bi].parts.findIndex(pt => !pt.label);
                  if (pi >= 0) {
                    setEditingSchemaField({ type: 'part-label', barIndex: bi, partIndex: pi });
                    found = true;
                  }
                }
                if (!found) setEditingSchemaField({ type: 'bar-label', barIndex: 0 });
              }
            } else {
              setEditingBarField('label');
            }
            onStartEdit(id);
          }}
          onStartEditValue={(id) => {
            const p = pieces.find(p => p.id === id);
            if (p?.type === 'schema') {
              const schema = p as Schema;
              // Target first bar without a value, or first bar with no parts
              const emptyBarIdx = schema.bars.findIndex(b => b.parts.length === 0 && b.value == null);
              if (emptyBarIdx >= 0) {
                setEditingSchemaField({ type: 'bar-value', barIndex: emptyBarIdx });
              } else {
                // Try first part without value
                let found = false;
                for (let bi = 0; bi < schema.bars.length && !found; bi++) {
                  const pi = schema.bars[bi].parts.findIndex(pt => pt.value == null);
                  if (pi >= 0) {
                    setEditingSchemaField({ type: 'part-value', barIndex: bi, partIndex: pi });
                    found = true;
                  }
                }
                if (!found) setEditingSchemaField({ type: 'bar-value', barIndex: 0 });
              }
            } else {
              setEditingBarField('value');
            }
            onStartEdit(id);
          }}
          onStartColumnCalc={(id) => { setColumnCalcPieceId(id); onSelectPiece(null); }}
          onStartDivisionCalc={(id) => { setDivisionCalcPieceId(id); onSelectPiece(null); }}
          onResizeBar={handleResizeBar}
          onDuplicateBar={handleDuplicateBar}
          onDuplicateBoite={handleDuplicateBoite}
          boiteHasChildren={selectedPiece.type === 'boite' && pieces.some(p => p.type === 'jeton' && (p as any).parentId === selectedPiece.id)}
          onChangeColor={handleChangeColor}
          onDuplicateJetons={handleDuplicateJetons}
          freeJetonCount={freeJetonCount}
          onRepartirJetons={handleRepartirJetons}
          onEditPiece={handleEditPiece}
          onStartEqualizing={handleStartEqualizing}
          onStartGrouping={handleStartGrouping}
          onUngroup={handleUngroup}
          onTableauPreview={(rows, cols) => { setTableauPreviewRows(rows); setTableauPreviewCols(cols); }}
          onDeletePiece={(id) => { dispatch({ type: 'DELETE_PIECE', id }); onSelectPiece(null); }}
          onDismiss={() => onSelectPiece(null)}
          onStartBondMode={onStartBondMode}
          onStopBondMode={onStopBondMode}
          bondMode={bondMode}
          selectedBondInfo={selectedBondInfo}
          onSelectBond={onSelectBond}
        />
      )}

      {/* Column calc overlay */}
      {columnCalcPieceId && (() => {
        const piece = pieces.find(p => p.id === columnCalcPieceId);
        if (!piece || piece.type !== 'calcul') return null;
        const svgEl = svgRef.current;
        if (!svgEl) return null;
        const ctm = svgEl.getScreenCTM();
        if (!ctm) return null;
        const cr = containerRef.current?.getBoundingClientRect();
        if (!cr) return null;
        const ptTop = new DOMPoint(piece.x, piece.y).matrixTransform(ctm);
        // ptTop used for left positioning
        // Parse existing expression to pre-fill the grid
        const parsed = parseExpression(piece.expression);
        // Restore saved column data if available — invalidate if expression was edited
        const rawData = piece.columnData ? JSON.parse(piece.columnData) : undefined;
        const rawSaved = rawData?.type === 'division' ? undefined : rawData as ColumnCalcData | undefined;
        const savedData = (rawSaved && parsed && rawSaved.operator !== parsed.operator) ? undefined : rawSaved;

        return (
          <ColumnCalc
            left={Math.max(8, ptTop.x - cr.left)}
            top={8}
            initialOperands={parsed?.operands}
            initialOperator={parsed?.operator}
            initialResult={parsed?.result}
            savedData={savedData}
            onCommit={(expr, data) => {
              dispatch({ type: 'EDIT_PIECE', id: columnCalcPieceId, changes: {
                expression: expr,
                columnData: JSON.stringify(data),
              }});
              setColumnCalcPieceId(null);
            }}
            onCancel={() => setColumnCalcPieceId(null)}
          />
        );
      })()}

      {/* Division calc overlay */}
      {divisionCalcPieceId && (() => {
        const piece = pieces.find(p => p.id === divisionCalcPieceId);
        if (!piece || piece.type !== 'calcul') return null;
        const svgEl = svgRef.current;
        if (!svgEl) return null;
        const ctm = svgEl.getScreenCTM();
        if (!ctm) return null;
        const cr = containerRef.current?.getBoundingClientRect();
        if (!cr) return null;
        const ptTop = new DOMPoint(piece.x, piece.y).matrixTransform(ctm);
        // ptTop used for left positioning
        // Parse existing expression for pre-fill
        const parsed = parseExpression(piece.expression);
        // Restore saved division data if available
        const savedColData = piece.columnData ? JSON.parse(piece.columnData) : undefined;
        const savedData = savedColData?.type === 'division' ? savedColData as DivisionCalcData : undefined;
        // Pre-fill from expression: for "A ÷ B = C", dividend=A, divisor=B
        const initialDividend = !savedData && parsed?.operator === '÷' ? parsed.operands[0] : (!savedData && parsed ? parsed.operands[0] : undefined);
        const initialDivisor = !savedData && parsed?.operator === '÷' ? parsed.operands[1] : (!savedData && parsed ? parsed.operands[1] : undefined);

        return (
          <DivisionCalc
            left={Math.max(8, ptTop.x - cr.left)}
            top={8}
            initialDividend={initialDividend}
            initialDivisor={initialDivisor}
            savedData={savedData}
            onCommit={(expr, data) => {
              dispatch({ type: 'EDIT_PIECE', id: divisionCalcPieceId, changes: {
                expression: expr,
                columnData: JSON.stringify(data),
              }});
              setDivisionCalcPieceId(null);
            }}
            onCancel={() => setDivisionCalcPieceId(null)}
          />
        );
      })()}

      {/* Tableau cell inputs overlay — HTML positioned over SVG cells */}
      {tableauEditorPieceId && (() => {
        const piece = pieces.find(p => p.id === tableauEditorPieceId);
        if (!piece || piece.type !== 'tableau') return null;
        const t = piece as Tableau;
        const ctm = svgRef.current?.getScreenCTM();
        const canvasRect = svgRef.current?.parentElement?.getBoundingClientRect();
        if (!ctm || !canvasRect) return null;
        const inputs = t.cells.map((row, ri) => row.map((_, ci) => {
          const svgX = t.x + ci * TABLEAU_CELL_W;
          const svgY = t.y + ri * TABLEAU_CELL_H;
          const topLeft = new DOMPoint(svgX, svgY).matrixTransform(ctm);
          const botRight = new DOMPoint(svgX + TABLEAU_CELL_W, svgY + TABLEAU_CELL_H).matrixTransform(ctm);
          const left = topLeft.x - canvasRect.left;
          const top = topLeft.y - canvasRect.top;
          const w = botRight.x - topLeft.x;
          const h = botRight.y - topLeft.y;
          return (
            <input
              key={`ti-${t.rows}-${t.cols}-${ri}-${ci}-${t.cells[ri][ci]}`}
              type="text"
              data-tableau-cell={`${ri}-${ci}`}
              defaultValue={t.cells[ri][ci]}
              placeholder={ri === 0 && t.headerRow ? '…' : ''}
              onBlur={e => {
                const val = e.target.value;
                if (val !== t.cells[ri][ci]) {
                  // Push to undo stack before committing
                  tableauUndo.push(`${ri}-${ci}`, t.cells[ri][ci]);
                  const newCells = t.cells.map((r, rri) => rri === ri ? r.map((c, cci) => cci === ci ? val : c) : [...r]);
                  dispatch({ type: 'EDIT_PIECE', id: t.id, changes: { cells: newCells } });
                }
              }}
              onFocus={() => setActiveCellRC({ row: ri, col: ci })}
              onKeyDown={e => {
                // Ctrl+Z — cell undo
                if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                  e.preventDefault();
                  e.stopPropagation();
                  const entry = tableauUndo.pop();
                  if (entry) {
                    const [ur, uc] = entry.cellId.split('-').map(Number);
                    const newCells = t.cells.map((r, rri) => rri === ur ? r.map((c, cci) => cci === uc ? entry.prevValue : c) : [...r]);
                    dispatch({ type: 'EDIT_PIECE', id: t.id, changes: { cells: newCells } });
                  }
                  return;
                }
                // Escape — exit tableau editing
                if (e.key === 'Escape') { e.preventDefault(); closeTableauEditor(); return; }
                // Shift+Tab — previous cell
                if (e.key === 'Tab' && e.shiftKey) {
                  e.preventDefault();
                  let nc = ci - 1, nr = ri;
                  if (nc < 0) { nc = t.cols - 1; nr--; }
                  if (nr >= 0) focusTableauCell(nr, nc);
                  else closeTableauEditor();
                  return;
                }
                // Tab — next cell (right, then next row)
                if (e.key === 'Tab') {
                  e.preventDefault();
                  let nc = ci + 1, nr = ri;
                  if (nc >= t.cols) { nc = 0; nr++; }
                  if (nr < t.rows) focusTableauCell(nr, nc);
                  else closeTableauEditor();
                  return;
                }
                // Enter — cell below (or next column first row)
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (ri + 1 < t.rows) focusTableauCell(ri + 1, ci);
                  else if (ci + 1 < t.cols) focusTableauCell(0, ci + 1);
                  return;
                }
                // Arrow keys — navigate when cursor at boundary
                const input = e.target as HTMLInputElement;
                const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
                const atEnd = input.selectionStart === input.value.length;
                if (e.key === 'ArrowRight' && atEnd && ci < t.cols - 1) { e.preventDefault(); focusTableauCell(ri, ci + 1); }
                if (e.key === 'ArrowLeft' && atStart && ci > 0) { e.preventDefault(); focusTableauCell(ri, ci - 1); }
                if (e.key === 'ArrowDown' && ri < t.rows - 1) { e.preventDefault(); focusTableauCell(ri + 1, ci); }
                if (e.key === 'ArrowUp' && ri > 0) { e.preventDefault(); focusTableauCell(ri - 1, ci); }
              }}
              onPointerDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', left, top, width: w, height: h,
                border: '1px solid #B0A0D0', borderRadius: 2,
                textAlign: 'center', fontSize: (ri === 0 && t.headerRow ? 6 : 5.5) / TABLEAU_CELL_H * h,
                background: ri === 0 && t.headerRow ? '#F2F0F8' : '#fff',
                fontWeight: ri === 0 && t.headerRow ? 600 : 400,
                outline: 'none', padding: 0, zIndex: 15,
                boxSizing: 'border-box',
              }}
            />
          );
        }));
        return inputs;
      })()}

      {/* Jeton counter by color — supports dyscalculia */}
      {showTokenCounter && (() => {
        const jetons = pieces.filter(p => p.type === 'jeton');
        if (jetons.length === 0) return null;
        const counts: Record<string, number> = {};
        jetons.forEach(j => { const c = (j as any).couleur || 'bleu'; counts[c] = (counts[c] || 0) + 1; });
        const COLOR_ORDER = ['bleu', 'rouge', 'vert', 'jaune'] as const;
        const colorLabels: Record<string, string> = { bleu: '#185FA5', rouge: '#C24B22', vert: '#0B7285', jaune: '#B8860B' };
        return (
          <div style={{
            position: 'absolute', bottom: 12, left: 12,
            display: 'flex', gap: 8, padding: '4px 10px',
            background: 'rgba(255,255,255,0.9)', borderRadius: 6,
            border: '1px solid #E8E5F0', fontSize: 12, zIndex: 10,
          }}>
            {COLOR_ORDER.filter(c => counts[c]).map(color => [color, counts[color]] as [string, number]).map(([color, count]) => (
              <span key={color} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorLabels[color] || '#185FA5', display: 'inline-block' }} />
                {count}
              </span>
            ))}
          </div>
        );
      })()}

      {/* R7: Ranger floating button — hidden in example mode */}
      {!hideLockBadge && pieces.some(p => !p.locked) && (
        <button
          onClick={handleArrange}
          disabled={isArranging}
          title="Ranger les pièces"
          aria-label="Ranger les pièces"
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            minWidth: 56,
            minHeight: 48,
            padding: '8px 14px',
            borderRadius: 8,
            background: '#fff',
            border: '1px solid #D5D0E0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            cursor: isArranging ? 'wait' : 'pointer',
            opacity: isArranging ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 14,
            color: '#3D3852',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>⊞</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Ranger</span>
        </button>
      )}

      {/* Nudge message when canvas is empty */}
      {pieces.length === 0 && nudgeMessage && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#55506A',
          fontSize: 16,
          textAlign: 'center',
          lineHeight: 2,
          pointerEvents: 'none',
          whiteSpace: 'pre-line',
        }}>
          {nudgeMessage}
        </div>
      )}
    </div>
  );
}

// === Piece rendering ===

function LockedBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={0} y={2} width={5} height={4} rx={0.5} fill="#9CA3AF" />
      <path d="M1,2 V1 A1.5,1.5 0 0,1 4,1 V2" fill="none" stroke="#9CA3AF" strokeWidth={0.7} />
    </g>
  );
}

function getLockedBadgePos(piece: Piece, referenceUnitMm: number): { x: number; y: number } {
  switch (piece.type) {
    case 'jeton': return { x: piece.x + 2, y: piece.y - 7 };
    case 'barre': return { x: piece.x + piece.sizeMultiplier * referenceUnitMm - 6, y: piece.y - 8 };
    case 'boite': return { x: piece.x + (piece as Boite).width - 6, y: piece.y - 2 };
    case 'etiquette': return { x: piece.x + Math.max(30, piece.text.length * 5.5 + 10) - 6, y: piece.y - 12 };
    case 'calcul': return { x: piece.x + getCalculWidth(piece) - 6, y: piece.y - 2 };
    case 'reponse': return { x: piece.x + getReponseWidth(piece as Reponse) - 6, y: piece.y - 2 };
    case 'droiteNumerique': return { x: piece.x + (piece as DroiteNumerique).width - 4, y: piece.y - 14 };
    case 'arbre': {
      const tl = computeTreeLayout((piece as Arbre).levels);
      return { x: piece.x + tl.width - 6, y: piece.y - 2 };
    }
    case 'schema': return { x: piece.x + computeSchemaWidth(piece as Schema, referenceUnitMm) - 6, y: piece.y - 2 };
    case 'inconnue': return { x: piece.x + 4, y: piece.y - 9 };
    case 'diagrammeBandes':
    case 'diagrammeLigne':
      return { x: piece.x + (piece as any).width - 6, y: piece.y - 2 };
    default: return { x: piece.x, y: piece.y - 8 };
  }
}

function PieceRenderer({ piece, referenceUnitMm, isSelected, reponseIds, highContrast, textScale = 1, toleranceMultiplier = 1, toolbarMode = 'essentiel', bondModeActive, bondFromVal, selectedBondIndex, hideLockBadge }: {
  piece: Piece;
  referenceUnitMm: number;
  isSelected: boolean;
  reponseIds?: string[];
  highContrast?: boolean;
  textScale?: number;
  toleranceMultiplier?: number;
  toolbarMode?: 'essentiel' | 'complet';
  bondModeActive?: boolean;
  bondFromVal?: number | null;
  selectedBondIndex?: number;
  hideLockBadge?: boolean;
}) {
  let inner: React.ReactElement | null;
  switch (piece.type) {
    case 'barre':
      inner = <BarrePiece piece={piece} referenceUnitMm={referenceUnitMm} isSelected={isSelected} highContrast={highContrast} textScale={textScale} />; break;
    case 'jeton':
      inner = <JetonPiece piece={piece} isSelected={isSelected} highContrast={highContrast} toleranceMultiplier={toleranceMultiplier} />; break;
    case 'boite':
      inner = <BoitePiece piece={piece} isSelected={isSelected} highContrast={highContrast} />; break;
    case 'etiquette':
      inner = <EtiquettePiece piece={piece} isSelected={isSelected} />; break;
    case 'calcul':
      inner = <CalculPiece piece={piece} isSelected={isSelected} textScale={textScale} />; break;
    case 'reponse':
      inner = <ReponsePiece piece={piece} isSelected={isSelected} textScale={textScale}
        reponseIndex={reponseIds?.indexOf(piece.id)} totalReponses={reponseIds?.length} />; break;
    case 'droiteNumerique':
      inner = <DroiteNumeriquePiece piece={piece as DroiteNumerique} isSelected={isSelected} textScale={textScale}
        toleranceMultiplier={toleranceMultiplier}
        toolbarMode={toolbarMode}
        bondMode={bondModeActive}
        bondFromVal={bondFromVal}
        selectedBondIndex={selectedBondIndex} />; break;
    case 'arbre':
      inner = <ArbrePiece piece={piece as Arbre} isSelected={isSelected} textScale={textScale} />; break;
    case 'schema':
      inner = <SchemaPiece piece={piece as Schema} referenceUnitMm={referenceUnitMm} isSelected={isSelected} highContrast={highContrast} textScale={textScale} />; break;
    case 'inconnue':
      inner = <InconnuePiece piece={piece as Inconnue} isSelected={isSelected} textScale={textScale} />; break;
    case 'diagrammeBandes':
      inner = <DiagrammeBandesPiece piece={piece as DiagrammeBandes} isSelected={isSelected} highContrast={highContrast} textScale={textScale} />; break;
    case 'diagrammeLigne':
      inner = <DiagrammeLignePiece piece={piece as any} isSelected={isSelected} highContrast={highContrast} textScale={textScale} />; break;
    case 'tableau':
      return null; // rendered separately in Canvas to pass editing props
    case 'fleche':
      return null; // arrows are rendered in a separate layer above
    default:
      return null;
  }
  if (!piece.locked || hideLockBadge) return inner;
  const pos = getLockedBadgePos(piece, referenceUnitMm);
  return (
    <>
      {inner}
      <LockedBadge x={pos.x} y={pos.y} />
    </>
  );
}

function JetonPiece({ piece, isSelected, highContrast, toleranceMultiplier = 1 }: { piece: Piece & { type: 'jeton' }; isSelected: boolean; highContrast?: boolean; toleranceMultiplier?: number }) {
  // Scale visual radius with tolerance: normal=5mm, large=5.6mm (+12%), très-large=6.25mm (+25%)
  const r = 5 * (1 + (toleranceMultiplier - 1) * 0.5);
  const color = getPieceColor(piece.couleur, highContrast);
  return (
    <circle
      cx={piece.x}
      cy={piece.y}
      r={r}
      fill={color}
      stroke={isSelected ? color : 'none'}
      strokeWidth={isSelected ? 1.5 : 0}
    />
  );
}

function EtiquettePiece({ piece, isSelected }: { piece: Piece & { type: 'etiquette' }; isSelected: boolean }) {
  const w = Math.max(30, piece.text.length * 5.5 + 10);
  const h = 10;
  return (
    <g>
      <rect
        x={piece.x - 2} y={piece.y - 7}
        width={w} height={h}
        rx={1.5}
        fill={isSelected ? 'rgba(112, 40, 224, 0.08)' : '#F0F2F5'}
        stroke={isSelected ? '#7028e0' : 'none'}
        strokeWidth={1}
      />
      <text
        x={piece.x} y={piece.y}
        fontSize={7}
        fill="#1E1A2E"
        data-edit-target={piece.id}
      >
        {piece.text || '…'}
      </text>
    </g>
  );
}

function InconnuePiece({ piece, isSelected, textScale = 1 }: { piece: Inconnue; isSelected: boolean; textScale?: number }) {
  const r = 6; // visual radius = 12mm diameter
  const ts = textScale;
  return (
    <g>
      <circle
        cx={piece.x} cy={piece.y} r={r}
        fill={isSelected ? 'rgba(112, 40, 224, 0.15)' : 'rgba(112, 40, 224, 0.08)'}
        stroke="#7028e0"
        strokeWidth={isSelected ? 1.5 : 1}
      />
      <text
        x={piece.x} y={piece.y}
        textAnchor="middle" dominantBaseline="central"
        fontSize={8 * ts} fontWeight="700" fill="#7028e0"
        data-edit-target={piece.id}
      >
        {piece.text || '?'}
      </text>
    </g>
  );
}

function BoitePiece({ piece, isSelected, highContrast }: { piece: Boite; isSelected: boolean; highContrast?: boolean }) {
  const color = getPieceColor(piece.couleur, highContrast);
  const fillColor = getPieceFillColor(piece.couleur, highContrast);
  return (
    <g>
      {/* Label above */}
      {piece.label && (
        <text x={piece.x + 4} y={piece.y - 3} fontSize={4.5} fill={color}
          data-edit-target={piece.id}>
          {piece.label}
        </text>
      )}
      {/* Main container */}
      <rect x={piece.x} y={piece.y} width={piece.width} height={piece.height} rx={2}
        fill={fillColor}
        stroke={isSelected ? color : '#9CA3AF'}
        strokeWidth={isSelected ? 1 : 0.5}
        strokeDasharray="3 2" />
      {/* Value in center (semi-abstract mode) */}
      {piece.value && (
        <text x={piece.x + piece.width / 2} y={piece.y + piece.height / 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize={8} fontWeight={600} fill={color}
          data-edit-target={piece.id}>
          {piece.value}
        </text>
      )}
      {/* Selection highlight */}
      {isSelected && (
        <rect x={piece.x - 1} y={piece.y - 1} width={piece.width + 2} height={piece.height + 2} rx={3}
          fill="none" stroke={color} strokeWidth={0.5} strokeDasharray="2 1" />
      )}
    </g>
  );
}

function CalculPiece({ piece, isSelected, textScale = 1 }: {
  piece: Piece & { type: 'calcul' };
  isSelected: boolean;
  textScale?: number;
}) {
  const ts = textScale;
  const displayText = formatExpr(piece.expression) || '…';
  const w = getCalculWidth(piece, ts);
  const h = 20;

  return (
    <g>
      <rect
        x={piece.x} y={piece.y} width={w} height={h} rx={3}
        fill={COLORS.calculBg}
        stroke={isSelected ? COLORS.primary : COLORS.calculBorder}
        strokeWidth={0.5}
      />
      <text
        x={piece.x + 6} y={piece.y + h / 2}
        dominantBaseline="central" fontSize={8 * ts}
        fontFamily="'Consolas', 'Courier New', monospace"
        fill={piece.expression ? COLORS.text : '#9CA3AF'}
        data-edit-target={piece.id}
      >
        {displayText}
      </text>
    </g>
  );
}

function ReponsePiece({ piece, isSelected, reponseIndex, totalReponses, textScale = 1 }: {
  piece: Piece & { type: 'reponse' };
  isSelected: boolean;
  reponseIndex?: number;
  totalReponses?: number;
  textScale?: number;
}) {
  const ts = textScale;
  const numbered = (totalReponses ?? 0) > 1 && reponseIndex != null;
  const hasTemplate = !!piece.template;

  // For template mode: render the template with filled blanks
  if (hasTemplate) {
    const parts = piece.template!.split('___');
    const blanks = piece.text ? piece.text.split('|') : [];

    // Estimate width: measure the full rendered template text
    let templateText = '';
    for (let i = 0; i < parts.length; i++) {
      templateText += parts[i];
      if (i < parts.length - 1) {
        templateText += blanks[i] || '____';
      }
    }
    const w = Math.max(120, templateText.length * 3.2 * ts + 20);
    const h = 22;

    // Build tspan segments for the template
    const segments: { text: string; isBlank: boolean; filled: boolean }[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) segments.push({ text: parts[i], isBlank: false, filled: false });
      if (i < parts.length - 1) {
        const val = blanks[i]?.trim();
        if (val) {
          segments.push({ text: val, isBlank: true, filled: true });
        } else {
          segments.push({ text: '____', isBlank: true, filled: false });
        }
      }
    }

    return (
      <g>
        <rect
          x={piece.x} y={piece.y} width={w} height={h} rx={2}
          fill="#fff"
          stroke={COLORS.reponseBorder}
          strokeWidth={isSelected ? 1 : 0.7}
        />
        <text x={piece.x + 6} y={piece.y + 7} fontSize={5 * ts} fill={COLORS.primary}>
          {numbered ? `Réponse ${reponseIndex! + 1} (à trous)` : 'Réponse (à trous)'}
        </text>
        <text x={piece.x + 6} y={piece.y + 18} fontSize={7 * ts} data-edit-target={piece.id}>
          {segments.map((seg, i) => (
            <tspan
              key={i}
              fill={seg.isBlank ? (seg.filled ? COLORS.primary : '#9CA3AF') : COLORS.text}
              fontWeight={seg.isBlank && seg.filled ? 'bold' : 'normal'}
            >
              {seg.text}
            </tspan>
          ))}
        </text>
      </g>
    );
  }

  // Free-form mode (original behavior)
  const w = Math.max(100, piece.text.length * 5.5 * ts + 24);
  const h = 26;

  return (
    <g>
      <rect
        x={piece.x} y={piece.y} width={w} height={h} rx={3}
        fill="#fff"
        stroke={COLORS.reponseBorder}
        strokeWidth={isSelected ? 1 : 0.7}
      />
      <text x={piece.x + 6} y={piece.y + 7} fontSize={5 * ts} fill={COLORS.primary}>
        {numbered ? `Réponse ${reponseIndex! + 1}` : 'Réponse'}
      </text>
      <text x={piece.x + 6} y={piece.y + 18} fontSize={7 * ts} fill={piece.text ? COLORS.text : '#9CA3AF'}
        data-edit-target={piece.id}>
        {piece.text || '…'}
      </text>
    </g>
  );
}

// Inline editor — rendered as HTML overlay above the SVG
function InlineEditor({ left, top, initialValue, placeholder, isCalcul, fontSize = 14, monospace, maxLength, minWidth = 200, fixedWidth, fixedHeight, textAlign, compact, borderRadiusPx, paddingLeftPx, fontWeight, onCommit, onCancel, onTab, onColumnCalc, onDivisionCalc }: {
  left: number; top: number;
  initialValue: string; placeholder: string;
  isCalcul?: boolean;
  fontSize?: number;
  monospace?: boolean;
  maxLength?: number;
  minWidth?: number;
  fixedWidth?: boolean;
  fixedHeight?: number;
  textAlign?: 'center' | 'left' | 'right';
  compact?: boolean;
  borderRadiusPx?: number;
  paddingLeftPx?: number;
  fontWeight?: number | string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onTab?: (value: string) => void;
  onColumnCalc?: () => void;
  onDivisionCalc?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const committed = useRef(false);

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    onCommit(value);
  };

  const insertSymbol = (sym: string) => {
    const input = inputRef.current;
    if (!input) { setValue(v => v + sym); return; }
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const newVal = value.slice(0, start) + sym + value.slice(end);
    setValue(newVal);
    // Restore cursor position after symbol
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + sym.length, start + sym.length);
    }, 0);
  };

  const resolvedRadius = compact ? 3 : (borderRadiusPx ?? 6);
  const resolvedWeight = fontWeight ?? 600;
  const useWidth = fixedWidth || !!fixedHeight;

  return (
    <div
      style={{ position: 'absolute', left, top, zIndex: 20 }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          data-testid="inline-editor"
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={e => setValue(e.target.value)}
          maxLength={maxLength}
          onKeyDown={e => {
            if (e.key === 'Tab' && onTab) { e.preventDefault(); e.stopPropagation(); if (!committed.current) { committed.current = true; onTab(value); } return; }
            if (e.key === 'Enter') { commit(); e.stopPropagation(); }
            if (e.key === 'Escape') { onCancel(); e.stopPropagation(); }
          }}
          onBlur={e => {
            // Don't commit if clicking on operator buttons or clear button
            if (e.relatedTarget && ((e.relatedTarget as HTMLElement).dataset?.operatorBtn || (e.relatedTarget as HTMLElement).dataset?.clearBtn)) return;
            commit();
          }}
          style={{
            width: useWidth ? minWidth : undefined,
            minWidth: useWidth ? undefined : minWidth,
            height: fixedHeight || Math.max(28, fontSize * 1.8),
            border: `2px solid #7028e0`,
            borderRadius: resolvedRadius,
            padding: compact ? '0 2px' : `2px 28px 2px ${paddingLeftPx ?? 6}px`,
            fontSize: Math.round(fontSize),
            fontFamily: monospace ? "'Consolas', 'Courier New', monospace" : 'inherit',
            fontWeight: resolvedWeight,
            textAlign: textAlign || 'left',
            background: '#fff',
            outline: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            boxSizing: 'border-box' as const,
          }}
        />
        {value && !compact && (
          <button
            data-clear-btn="true"
            tabIndex={-1}
            onPointerDown={e => e.preventDefault()}
            onClick={() => { setValue(''); inputRef.current?.focus(); }}
            style={{
              position: 'absolute', right: 4,
              width: 22, height: 22, borderRadius: '50%',
              background: '#D5D0E0', border: 'none',
              cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
      {/* Operator buttons for Calcul */}
      {isCalcul && (
        <div style={{
          display: 'flex',
          gap: 4,
          marginTop: 4,
          alignItems: 'center',
        }}>
          {['+', '−', '×', '÷', '='].map(sym => (
            <button
              key={sym}
              data-operator-btn="true"
              tabIndex={-1}
              onPointerDown={e => e.preventDefault()}
              onClick={() => insertSymbol(sym === '−' ? '-' : sym)}
              style={{
                minWidth: MIN_BUTTON_SIZE_PX,
                height: MIN_BUTTON_SIZE_PX,
                fontSize: 18,
                fontWeight: 600,
                background: UI_BG,
                border: `1px solid ${UI_BORDER}`,
                borderRadius: 4,
                cursor: 'pointer',
                color: UI_PRIMARY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {sym}
            </button>
          ))}
          {onColumnCalc && (
            <>
              <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 2px' }} />
              <button
                data-operator-btn="true"
                tabIndex={-1}
                onPointerDown={e => e.preventDefault()}
                onClick={() => {
                  // Commit current value before switching to column mode
                  const val = inputRef.current?.value ?? '';
                  committed.current = true;
                  onCommit(val);
                  // Route to DivisionCalc if expression contains ÷ or /, else ColumnCalc
                  setTimeout(() => {
                    if (onDivisionCalc && (val.includes('÷') || val.includes('/'))) {
                      onDivisionCalc();
                    } else if (onColumnCalc) {
                      onColumnCalc();
                    }
                  }, 0);
                }}
                style={{
                  minHeight: MIN_BUTTON_SIZE_PX,
                  padding: '0 10px',
                  fontSize: 11,
                  background: UI_BG,
                  border: `1px solid ${UI_BORDER}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: UI_TEXT_SECONDARY,
                  whiteSpace: 'nowrap',
                }}
              >
                En colonnes
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Simple expression formatting for display
function formatExpr(s: string): string {
  return s.replace(/\*/g, '×').replace(/x/gi, '×').replace(/\//g, '÷').replace(/\./g, ',');
}

// Parse an expression like "28 × 4 = 112", "3 + 5 + 2 = 10", or "3,45 + 2,78 = 6,23" into components
function parseExpression(expr: string): { operands: string[]; operator: string; result: string } | null {
  if (!expr) return null;
  // Normalize operators
  const normalized = expr.replace(/×/g, '*').replace(/x/gi, '*').replace(/÷/g, '/').replace(/−/g, '-');

  // Try multi-operand addition: NUM + NUM + NUM ... (= NUM)?
  const addMatch = normalized.match(/^\s*(\d+(?:[,\.]\d+)?(?:\s*\+\s*\d+(?:[,\.]\d+)?)+)\s*(?:=\s*(\d+(?:[,\.]\d+)?))?\s*$/);
  if (addMatch) {
    const parts = addMatch[1].split(/\s*\+\s*/);
    return {
      operands: parts.map(p => p.replace(/,/g, '.')),
      operator: '+',
      result: addMatch[2] ? addMatch[2].replace(/,/g, '.') : '',
    };
  }

  // 2-operand for other operators (−, ×, ÷)
  const match = normalized.match(/^\s*(\d+(?:[,\.]\d+)?)\s*([+\-*/])\s*(\d+(?:[,\.]\d+)?)\s*(?:=\s*(\d+(?:[,\.]\d+)?))?\s*$/);
  if (!match) return null;
  const opMap: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  // Normalize commas to dots for internal use
  return {
    operands: [match[1].replace(/,/g, '.'), match[3].replace(/,/g, '.')],
    operator: opMap[match[2]] || '+',
    result: match[4] ? match[4].replace(/,/g, '.') : '',
  };
}

// === Reponse width helper ===

function getCalculWidth(piece: Piece & { type: 'calcul' }, ts = 1): number {
  return Math.max(80, piece.expression.length * 7 * ts + 16);
}

function getReponseWidth(piece: Reponse, ts = 1): number {
  if (piece.template) {
    const parts = piece.template.split('___');
    const blanks = piece.text ? piece.text.split('|') : [];
    let templateText = '';
    for (let i = 0; i < parts.length; i++) {
      templateText += parts[i];
      if (i < parts.length - 1) {
        templateText += blanks[i] || '____';
      }
    }
    return Math.max(120, templateText.length * 4.5 * ts + 24);
  }
  return Math.max(100, piece.text.length * 5.5 * ts + 24);
}

// === Hit test ===

const TABLEAU_CELL_W = 18; // mm — wider to fit text like "Lundi", "Température"
const TABLEAU_CELL_H = 12; // mm (WCAG 2.5.5: 12mm ≈ 45px meets 44px minimum)

function TableauPiece({ piece, isSelected, isEditing, previewRows, previewCols, activeRow, activeCol }: {
  piece: Tableau; isSelected: boolean;
  isEditing?: boolean;
  previewRows?: number | null;
  previewCols?: number | null;
  activeRow?: number | null;
  activeCol?: number | null;
}) {
  const tw = piece.cols * TABLEAU_CELL_W;
  const th = piece.rows * TABLEAU_CELL_H;
  return (
    <g>
      {/* Outer border */}
      <rect x={piece.x} y={piece.y} width={tw} height={th} rx={1}
        fill="#fff" stroke={isSelected || isEditing ? '#7028e0' : '#D5D0E0'} strokeWidth={isSelected || isEditing ? 1 : 0.5} />
      {/* Header row background */}
      {piece.headerRow && (
        <rect x={piece.x} y={piece.y} width={tw} height={TABLEAU_CELL_H} rx={1}
          fill="#F2F0F8" />
      )}
      {/* Active row/column highlight for visuospatial orientation */}
      {activeRow != null && (
        <rect x={piece.x} y={piece.y + activeRow * TABLEAU_CELL_H}
          width={tw} height={TABLEAU_CELL_H}
          fill="rgba(112, 40, 224, 0.06)" />
      )}
      {activeCol != null && (
        <rect x={piece.x + activeCol * TABLEAU_CELL_W} y={piece.y}
          width={TABLEAU_CELL_W} height={th}
          fill="rgba(112, 40, 224, 0.06)" />
      )}
      {/* Cell borders + text */}
      {piece.cells.map((row, ri) => row.map((cell, ci) => {
        const cx = piece.x + ci * TABLEAU_CELL_W;
        const cy = piece.y + ri * TABLEAU_CELL_H;
        return (
          <g key={`${ri}-${ci}`}>
            <rect x={cx} y={cy} width={TABLEAU_CELL_W} height={TABLEAU_CELL_H}
              fill="none" stroke={isEditing ? '#B0A0D0' : '#D5D0E0'} strokeWidth={isEditing ? 0.4 : 0.3} />
            <text x={cx + TABLEAU_CELL_W / 2} y={cy + TABLEAU_CELL_H / 2}
              textAnchor="middle" dominantBaseline="central"
              fontSize={(cell || '').length > 4 ? Math.max(3, TABLEAU_CELL_W / ((cell || '').length * 0.5)) : (ri === 0 && piece.headerRow ? 6 : 5.5)}
              fontWeight={ri === 0 && piece.headerRow ? 600 : 400}
              fill={isEditing ? 'transparent' : '#1E1A2E'}
              data-edit-target={`${piece.id}-${ri}-${ci}`}>
              {cell || (ri === 0 && piece.headerRow ? '—' : '')}
            </text>
          </g>
        );
      }))}
      {/* Preview: added rows */}
      {previewRows != null && previewRows > piece.rows && Array.from({ length: previewRows - piece.rows }, (_, i) => (
        <rect key={`pr-${i}`} x={piece.x} y={piece.y + (piece.rows + i) * TABLEAU_CELL_H}
          width={tw} height={TABLEAU_CELL_H} rx={0}
          fill="rgba(112, 40, 224, 0.08)" stroke="#7028e0" strokeWidth={0.5} strokeDasharray="3 2" />
      ))}
      {/* Preview: removed rows */}
      {previewRows != null && previewRows < piece.rows && Array.from({ length: piece.rows - previewRows }, (_, i) => (
        <rect key={`dr-${i}`} x={piece.x} y={piece.y + (previewRows + i) * TABLEAU_CELL_H}
          width={tw} height={TABLEAU_CELL_H} rx={0}
          fill="rgba(200, 40, 40, 0.15)" stroke="#C82828" strokeWidth={0.5} strokeDasharray="3 2" />
      ))}
      {/* Preview: added cols */}
      {previewCols != null && previewCols > piece.cols && Array.from({ length: previewCols - piece.cols }, (_, i) => (
        <rect key={`pc-${i}`} x={piece.x + (piece.cols + i) * TABLEAU_CELL_W} y={piece.y}
          width={TABLEAU_CELL_W} height={th} rx={0}
          fill="rgba(112, 40, 224, 0.08)" stroke="#7028e0" strokeWidth={0.5} strokeDasharray="3 2" />
      ))}
      {/* Preview: removed cols */}
      {previewCols != null && previewCols < piece.cols && Array.from({ length: piece.cols - previewCols }, (_, i) => (
        <rect key={`dc-${i}`} x={piece.x + (previewCols + i) * TABLEAU_CELL_W} y={piece.y}
          width={TABLEAU_CELL_W} height={th} rx={0}
          fill="rgba(200, 40, 40, 0.15)" stroke="#C82828" strokeWidth={0.5} strokeDasharray="3 2" />
      ))}
      {/* Selection highlight */}
      {isSelected && (
        <rect x={piece.x - 1} y={piece.y - 1} width={tw + 2} height={th + 2} rx={2}
          fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={1} />
      )}
    </g>
  );
}

function hitTest(piece: Piece, pos: { x: number; y: number }, refUnit: number, padding = 0, jetonPadding = 0, pieces: Piece[] = []): boolean {
  const p = padding; // additive padding (mm) for tolerance profiles
  switch (piece.type) {
    case 'jeton': {
      const dx = pos.x - piece.x;
      const dy = pos.y - piece.y;
      return Math.sqrt(dx * dx + dy * dy) <= 11 + jetonPadding;
    }
    case 'barre': {
      const w = piece.sizeMultiplier * refUnit;
      return pos.x >= piece.x - p - 20 && pos.x <= piece.x + w + p &&
             pos.y >= piece.y - p && pos.y <= piece.y + BAR_HEIGHT_MM + p;
    }
    case 'etiquette': {
      const ew = Math.max(30, piece.text.length * 5.5 + 10);
      return pos.x >= piece.x - 2 - p && pos.x <= piece.x + ew + p &&
             pos.y >= piece.y - 7 - p && pos.y <= piece.y + 3 + p;
    }
    case 'boite': {
      return pos.x >= piece.x - p && pos.x <= piece.x + piece.width + p &&
             pos.y >= piece.y - p - 8 && pos.y <= piece.y + piece.height + p;
    }
    case 'calcul': {
      const w = getCalculWidth(piece);
      return pos.x >= piece.x - p && pos.x <= piece.x + w + p &&
             pos.y >= piece.y - p && pos.y <= piece.y + 20 + p;
    }
    case 'reponse': {
      const w = getReponseWidth(piece);
      return pos.x >= piece.x - p && pos.x <= piece.x + w + p &&
             pos.y >= piece.y - p && pos.y <= piece.y + 22 + p;
    }
    case 'droiteNumerique': {
      const w = (piece as DroiteNumerique).width;
      return pos.x >= piece.x - p && pos.x <= piece.x + w + p &&
             pos.y >= piece.y - 10 - p && pos.y <= piece.y + 12 + p;
    }
    case 'tableau': {
      const t = piece as Tableau;
      const tw = t.cols * TABLEAU_CELL_W;
      const th = t.rows * TABLEAU_CELL_H;
      return pos.x >= t.x - p && pos.x <= t.x + tw + p &&
             pos.y >= t.y - p && pos.y <= t.y + th + p;
    }
    case 'arbre': {
      const tl = computeTreeLayout((piece as Arbre).levels);
      return pos.x >= piece.x - p - 20 && pos.x <= piece.x + tl.width + p &&
             pos.y >= piece.y - p && pos.y <= piece.y + tl.height + p;
    }
    case 'schema': {
      const sw = computeSchemaWidth(piece as Schema, refUnit);
      const sh = computeSchemaHeight(piece as Schema);
      return pos.x >= piece.x - p - 20 && pos.x <= piece.x + sw + p &&
             pos.y >= piece.y - p && pos.y <= piece.y + sh + p;
    }
    case 'inconnue': {
      const dx = pos.x - piece.x;
      const dy = pos.y - piece.y;
      return Math.sqrt(dx * dx + dy * dy) <= 9 + p; // hit radius > visual radius (ergo)
    }
    case 'diagrammeBandes':
    case 'diagrammeLigne': {
      const cw = (piece as any).width || 120;
      const ch = (piece as any).height || 90;
      return pos.x >= piece.x - p && pos.x <= piece.x + cw + p &&
             pos.y >= piece.y - p && pos.y <= piece.y + ch + p + 12;
    }
    case 'fleche': {
      const fleche = piece as Fleche;
      const from = pieces.find(p => p.id === fleche.fromId);
      const to = pieces.find(p => p.id === fleche.toId);
      if (!from || !to) return false;
      const fc = getPieceCenter(from, refUnit);
      const tc = getPieceCenter(to, refUnit);
      return distanceToSegment(pos, fc, tc) < 3 + p;
    }
    default:
      return false;
  }
}

function distanceToSegment(p: {x:number,y:number}, a: {x:number,y:number}, b: {x:number,y:number}): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Get the bounding box {x, y, w, h} of a piece with optional padding. */
function getPieceBounds(piece: Piece, referenceUnitMm: number, pad = 0, ts = 1): { x: number; y: number; w: number; h: number } {
  switch (piece.type) {
    case 'jeton': return { x: piece.x - 5 - pad, y: piece.y - 5 - pad, w: 10 + 2 * pad, h: 10 + 2 * pad };
    case 'barre': return { x: piece.x - pad - 20, y: piece.y - pad, w: piece.sizeMultiplier * referenceUnitMm + 2 * pad + 20, h: BAR_HEIGHT_MM + 2 * pad };
    case 'boite': return { x: piece.x - pad, y: piece.y - pad - 8, w: piece.width + 2 * pad, h: piece.height + 2 * pad + 8 };
    case 'calcul': return { x: piece.x - pad, y: piece.y - pad, w: getCalculWidth(piece, ts) + 2 * pad, h: 20 + 2 * pad };
    case 'reponse': return { x: piece.x - pad, y: piece.y - pad, w: getReponseWidth(piece as Reponse, ts) + 2 * pad, h: 26 + 2 * pad };
    case 'etiquette': return { x: piece.x - pad, y: piece.y - 7 - pad, w: Math.max(30, piece.text.length * 5.5 + 10) + 2 * pad, h: 10 + 2 * pad };
    case 'droiteNumerique': return { x: piece.x - pad, y: piece.y - 10 - pad, w: (piece as DroiteNumerique).width + 2 * pad, h: 20 + 2 * pad };
    case 'tableau': return { x: piece.x - pad, y: piece.y - pad, w: (piece as Tableau).cols * TABLEAU_CELL_W + 2 * pad, h: (piece as Tableau).rows * TABLEAU_CELL_H + 2 * pad };
    case 'arbre': { const tl = computeTreeLayout((piece as Arbre).levels); return { x: piece.x - pad - 20, y: piece.y - pad, w: tl.width + 2 * pad + 20, h: tl.height + 2 * pad }; }
    case 'schema': return { x: piece.x - pad - 20, y: piece.y - pad, w: computeSchemaWidth(piece as Schema, referenceUnitMm) + 2 * pad + 20, h: computeSchemaHeight(piece as Schema) + 2 * pad };
    case 'inconnue': return { x: piece.x - 6 - pad, y: piece.y - 6 - pad, w: 12 + 2 * pad, h: 12 + 2 * pad };
    case 'diagrammeBandes':
    case 'diagrammeLigne':
      return { x: piece.x - pad, y: piece.y - pad, w: ((piece as any).width || 120) + 2 * pad, h: ((piece as any).height || 90) + 2 * pad + 12 };
    default: return { x: piece.x - pad, y: piece.y - pad, w: 20 + 2 * pad, h: 14 + 2 * pad };
  }
}

function getPieceCenter(piece: Piece, referenceUnitMm: number): { x: number; y: number } {
  switch (piece.type) {
    case 'jeton': return { x: piece.x, y: piece.y };
    case 'barre': return { x: piece.x + (piece.sizeMultiplier * referenceUnitMm) / 2, y: piece.y + BAR_HEIGHT_MM / 2 };
    case 'boite': return { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 };
    case 'calcul': return { x: piece.x + getCalculWidth(piece) / 2, y: piece.y + 7 };
    case 'reponse': return { x: piece.x + getReponseWidth(piece) / 2, y: piece.y + 11 };
    case 'etiquette': return { x: piece.x + Math.max(30, piece.text.length * 5.5 + 10) / 2, y: piece.y - 2 };
    case 'droiteNumerique': return { x: piece.x + (piece as DroiteNumerique).width / 2, y: piece.y };
    case 'tableau': return { x: piece.x + (piece as Tableau).cols * TABLEAU_CELL_W / 2, y: piece.y + (piece as Tableau).rows * TABLEAU_CELL_H / 2 };
    case 'arbre': { const tl = computeTreeLayout((piece as Arbre).levels); return { x: piece.x + tl.width / 2, y: piece.y + tl.height / 2 }; }
    case 'schema': return { x: piece.x + computeSchemaWidth(piece as Schema, referenceUnitMm) / 2, y: piece.y + computeSchemaHeight(piece as Schema) / 2 };
    case 'inconnue': return { x: piece.x, y: piece.y };
    case 'diagrammeBandes':
    case 'diagrammeLigne':
      return { x: piece.x + ((piece as any).width || 120) / 2, y: piece.y + ((piece as any).height || 90) / 2 };
    default: return { x: piece.x, y: piece.y };
  }
}

/** Get the point on the edge of a piece's bounding box closest to a target point. */
function getEdgePoint(piece: Piece, target: { x: number; y: number }, refUnit: number): { x: number; y: number } {
  let bx: number, by: number, bw: number, bh: number;
  switch (piece.type) {
    case 'jeton': return { x: piece.x, y: piece.y }; // circle — center is fine
    case 'barre': bx = piece.x - 20; by = piece.y; bw = piece.sizeMultiplier * refUnit + 20; bh = BAR_HEIGHT_MM; break;
    case 'boite': bx = piece.x; by = piece.y - 8; bw = piece.width; bh = piece.height + 8; break;
    case 'calcul': bx = piece.x; by = piece.y; bw = getCalculWidth(piece); bh = 20; break;
    case 'reponse': bx = piece.x; by = piece.y; bw = getReponseWidth(piece); bh = 26; break;
    case 'etiquette': bx = piece.x; by = piece.y - 7; bw = Math.max(30, piece.text.length * 5.5 + 10); bh = 10; break;
    case 'droiteNumerique': bx = piece.x; by = piece.y - 10; bw = (piece as DroiteNumerique).width; bh = 20; break;
    case 'tableau': bx = piece.x; by = piece.y; bw = (piece as Tableau).cols * TABLEAU_CELL_W; bh = (piece as Tableau).rows * TABLEAU_CELL_H; break;
    case 'arbre': { const tl = computeTreeLayout((piece as Arbre).levels); bx = piece.x - 20; by = piece.y; bw = tl.width + 20; bh = tl.height; break; }
    case 'schema': bx = piece.x - 20; by = piece.y; bw = computeSchemaWidth(piece as Schema, refUnit) + 20; bh = computeSchemaHeight(piece as Schema); break;
    case 'inconnue': return { x: piece.x, y: piece.y }; // circle — center is fine
    case 'diagrammeBandes':
    case 'diagrammeLigne':
      bx = piece.x; by = piece.y; bw = (piece as any).width || 120; bh = (piece as any).height || 90; break;
    default: return { x: piece.x, y: piece.y };
  }
  // Clamp target to the edge of the bounding box
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: by }; // default: top center
  const scaleX = dx !== 0 ? (bw / 2) / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? (bh / 2) / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

// === Piece factory ===

function createPiece(tool: NonNullable<ToolType>, pos: { x: number; y: number }, referenceUnitMm = 60): Piece | null {
  const id = generateId();
  switch (tool) {
    case 'jeton':
      return { id, type: 'jeton', x: pos.x, y: pos.y, locked: false, couleur: 'bleu', parentId: null };
    case 'barre':
      return { id, type: 'barre', x: pos.x, y: pos.y, locked: false, couleur: 'bleu', sizeMultiplier: 1, label: '', value: '', divisions: null, coloredParts: [], showFraction: false, groupId: null, groupLabel: null };
    case 'boite':
      return { id, type: 'boite', x: pos.x, y: pos.y, locked: false,
        width: 60, height: 40, label: '', value: '', couleur: 'bleu' };
    case 'etiquette':
      return { id, type: 'etiquette', x: pos.x, y: pos.y, locked: false, text: '', attachedTo: null };
    case 'inconnue':
      return { id, type: 'inconnue', x: pos.x, y: pos.y, locked: false, text: '?', attachedTo: null };
    case 'calcul':
      return { id, type: 'calcul', x: pos.x, y: pos.y, locked: false, expression: '' };
    case 'reponse':
      return { id, type: 'reponse', x: pos.x, y: pos.y, locked: false, text: '', template: null };
    case 'droiteNumerique':
      return { id, type: 'droiteNumerique', x: pos.x, y: pos.y, locked: false,
        min: 0, max: 10, step: 1, markers: [], bonds: [], width: 200 };
    case 'tableau':
      return { id, type: 'tableau', x: pos.x, y: pos.y, locked: false,
        rows: 2, cols: 3, cells: Array.from({ length: 2 }, () => Array(3).fill('')), headerRow: true };
    case 'arbre':
      return { id, type: 'arbre', x: pos.x, y: pos.y, locked: false,
        levels: [
          { name: '', options: ['', ''] },
          { name: '', options: ['', ''] },
        ] };
    case 'schema': {
      const defaults = getGabaritDefaults('parties-tout', referenceUnitMm); // R3: default parties-tout
      return { id, type: 'schema', x: pos.x, y: pos.y, locked: false,
        gabarit: 'parties-tout',
        totalLabel: defaults.totalLabel ?? '',
        totalValue: defaults.totalValue ?? null,
        bars: defaults.bars ?? [{ label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] }],
        referenceWidth: defaults.referenceWidth ?? 60,
      };
    }
    case 'diagrammeBandes':
      return { id, type: 'diagrammeBandes', x: pos.x, y: pos.y, locked: false,
        title: '', yAxisLabel: '', width: 120, height: 90,
        categories: [
          { label: 'Pommes', value: 3, couleur: 'bleu' },
          { label: 'Bananes', value: 5, couleur: 'rouge' },
          { label: 'Oranges', value: 2, couleur: 'vert' },
        ] };
    case 'diagrammeLigne':
      return { id, type: 'diagrammeLigne', x: pos.x, y: pos.y, locked: false,
        title: '', yAxisLabel: '', width: 120, height: 90,
        points: [
          { label: 'Lundi', value: 3 },
          { label: 'Mardi', value: 5 },
          { label: 'Mercredi', value: 2 },
        ] };
    case 'fleche':
      return null; // fleche uses two-click placement, not createPiece
    case 'deplacer':
      return null; // deplacer is not a placement tool
  }
}
