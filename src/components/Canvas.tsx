import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useContainerSize } from '../hooks/useContainerSize';
import { pointerToMm, snapToGrid, calculateViewBoxHeight } from '../engine/coordinates';
import { snapBarAlignment } from '../engine/snap';
import { getTolerances } from '../engine/tolerances';
import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';
import { CANVAS_WIDTH_MM, BAR_HEIGHT_MM, BAR_VERTICAL_GAP_MM } from '../model/types';
import type { Piece, Barre, ToolType, ToleranceProfile, CouleurPiece, Fleche, Reponse, DroiteNumerique } from '../model/types';
import { isBarre, isDroiteNumerique } from '../model/types';
import type { Action } from '../model/state';
import { generateId } from '../model/id';
import { COLORS, UI_BG, UI_BORDER, UI_PRIMARY, UI_TEXT_SECONDARY, getPieceColor } from '../config/theme';
import { BarrePiece } from './pieces/BarrePiece';
import { DroiteNumeriquePiece } from './pieces/DroiteNumeriquePiece';
import { ContextActions } from './ContextActions';
import { ColumnCalc, type ColumnCalcData } from './ColumnCalc';
import { DivisionCalc, type DivisionCalcData } from './DivisionCalc';
import { onPlace, onSnap } from '../engine/sound';
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
  deleteMode: boolean;
  deleteConfirmId: string | null;
  toleranceProfile: ToleranceProfile;
  cursorSmoothing: boolean;
  smoothingAlpha: number;
  dispatch: React.Dispatch<Action>;
  onSelectPiece: (id: string | null) => void;
  onSetTool: (tool: ToolType) => void;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  onDeleteClick: (id: string) => void;
  arrowFromId?: string | null;
  onSetArrowFrom?: (id: string) => void;
  onArrowCreated?: () => void;
  nudgeMessage?: string;
  equalizingFromId?: string | null;
  onSetEqualizingFromId?: (id: string | null) => void;
  groupingBarId?: string | null;
  onSetGroupingBarId?: (id: string | null) => void;
  showSuggestedZones?: boolean;
}

type InteractionMode =
  | { type: 'idle' }
  | { type: 'moving'; pieceId: string };

function getCanvasCursor(
  activeTool: ToolType,
  deleteMode: boolean,
  isMoving: boolean,
  isHoveringPiece: boolean,
): string {
  if (isMoving) return 'grabbing';
  if (deleteMode) return 'crosshair';
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
  deleteMode,
  deleteConfirmId: _deleteConfirmId,
  toleranceProfile: _toleranceProfile,
  cursorSmoothing: _cursorSmoothing,
  smoothingAlpha: _smoothingAlpha,
  dispatch,
  onSelectPiece,
  onSetTool,
  onStartEdit,
  onStopEdit,
  onDeleteClick,
  arrowFromId,
  onSetArrowFrom,
  onArrowCreated,
  nudgeMessage,
  equalizingFromId,
  onSetEqualizingFromId,
  groupingBarId,
  onSetGroupingBarId,
  showSuggestedZones,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastClickTime = useRef(0);
  const [mode, setMode] = useState<InteractionMode>({ type: 'idle' });
  const [columnCalcPieceId, setColumnCalcPieceId] = useState<string | null>(null);
  const [divisionCalcPieceId, setDivisionCalcPieceId] = useState<string | null>(null);
  const [lastPlacedId, setLastPlacedId] = useState<string | null>(null);
  const [editingBarField, setEditingBarField] = useState<'label' | 'value' | null>(null);
  const [isArranging, setIsArranging] = useState(false);
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);
  // Pan removed — drag conflicts with piece movement. Ranger + auto-height suffisent.
  const originalMovePos = useRef<{ x: number; y: number } | null>(null);
  const moveOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const smoothingRef = useRef<SmoothingState>(createSmoothingState());

  const { width: containerWidth, height: containerHeight } = useContainerSize(containerRef);
  const viewBoxHeight = calculateViewBoxHeight(CANVAS_WIDTH_MM, containerWidth, containerHeight);
  const tol = useMemo(() => getTolerances(_toleranceProfile), [_toleranceProfile]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const now = Date.now();
    if (now - lastClickTime.current < tol.clickDebounceMs) return;
    lastClickTime.current = now;

    // If editing, the blur handler will commit — just close editing and don't process this click further
    if (editingPieceId) {
      onStopEdit();
      return;
    }

    if (!svgRef.current) return;
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

    // Hit test: small pieces first (jetons > étiquettes > calculs > barres > boîtes)
    const HIT_PRIORITY: Record<string, number> = { jeton: 0, etiquette: 1, calcul: 2, reponse: 3, barre: 4, droiteNumerique: 4, fleche: 5, boite: 6 };
    const sortedPieces = [...pieces].sort((a, b) => (HIT_PRIORITY[a.type] ?? 9) - (HIT_PRIORITY[b.type] ?? 9));

    let hitPiece: Piece | null = null;
    let hitDist = Infinity;
    for (const piece of sortedPieces) {
      if (hitTest(piece, pos, referenceUnitMm, tol.hitTestPaddingMm, tol.jetonHitPaddingMm, pieces)) {
        // If a placement tool is active and we hit a boîte, skip it — place inside instead
        if (activeTool && activeTool !== 'deplacer' && piece.type === 'boite') {
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
      // Delete mode — handle delete click
      if (deleteMode) {
        onDeleteClick(hitPiece.id);
        return;
      }
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
      // DroiteNumerique marker toggle — clicking on a selected droite adds/removes a marker
      if (isDroiteNumerique(hitPiece) && hitPiece.id === selectedPieceId) {
        const dn = hitPiece as DroiteNumerique;
        const relX = pos.x - dn.x;
        const ratio = relX / dn.width;
        const nearestVal = Math.round(dn.min + ratio * (dn.max - dn.min));
        const clamped = Math.max(dn.min, Math.min(dn.max, nearestVal));
        // Snap to nearest step
        const snapped2 = Math.round((clamped - dn.min) / dn.step) * dn.step + dn.min;
        const markers = [...dn.markers];
        const idx = markers.findIndex(m => Math.abs(m - snapped2) < 0.001);
        if (idx >= 0) markers.splice(idx, 1);
        else markers.push(snapped2);
        dispatch({ type: 'EDIT_PIECE', id: hitPiece.id, changes: { markers } });
        return; // don't re-select
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
          onArrowCreated?.();
          onSetTool(null);
        }
        return;
      }
      // Move tool — start moving the piece
      if (activeTool === 'deplacer') {
        handleStartMove(hitPiece.id, pos);
        return;
      }
      // Calcul/Réponse/Étiquette — direct edit on click
      if (hitPiece.type === 'calcul' || hitPiece.type === 'reponse' || hitPiece.type === 'etiquette') {
        onStartEdit(hitPiece.id);
        return;
      }
      onSelectPiece(hitPiece.id);
      return;
    }

    // Delete mode — click on empty space exits
    if (deleteMode) {
      onSelectPiece(null);
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
        for (let i = 0; i < jetonQuantity; i++) {
          const col = i % perRow;
          const row = Math.floor(i / perRow);
          jetons.push({
            id: generateId(),
            type: 'jeton',
            x: snapped.x + col * spacing,
            y: snapped.y + row * spacing,
            locked: false,
            couleur: 'bleu',
            parentId: targetBoite ? targetBoite.id : null,
          });
        }
        dispatch({ type: 'PLACE_PIECES', pieces: jetons });
        onPlace();
        onSetTool(null);
      } else if (activeTool === 'reponse' && pieces.some(p => p.type === 'reponse')) {
        // Réponse: only one allowed — select existing
        const existing = pieces.find(p => p.type === 'reponse');
        if (existing) {
          onSelectPiece(existing.id);
          onStartEdit(existing.id);
        }
        onSetTool(null);
      } else {
        const piece = createPiece(activeTool, snapped);
        if (!piece) return; // deplacer tool — no piece to create
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
        }
        // B7: Auto-attach étiquette to nearby piece
        if (piece.type === 'etiquette') {
          const nearbyPiece = pieces.find(p => {
            if (p.type === 'etiquette' || p.type === 'fleche') return false;
            const center = getPieceCenter(p, referenceUnitMm);
            const dist = Math.hypot(snapped.x - center.x, snapped.y - center.y);
            return dist < 15;
          });
          if (nearbyPiece) {
            piece.attachedTo = nearbyPiece.id;
          }
        }
        dispatch({ type: 'PLACE_PIECE', piece });
        onPlace(); // sound + haptic
        setLastPlacedId(piece.id);
        setTimeout(() => setLastPlacedId(null), 200);
        // Always deactivate tool after placement (one action at a time — simpler for children)
        onSetTool(null);
        // Auto-edit text pieces; auto-select others to show context actions
        if (piece.type === 'calcul' || piece.type === 'reponse' || piece.type === 'etiquette') {
          onStartEdit(piece.id);
        } else {
          onSelectPiece(piece.id);
        }
      }
    } else {
      // No tool active, click on empty space — deselect
      onSelectPiece(null);
    }
  }, [pieces, activeTool, referenceUnitMm, dispatch, onSelectPiece, onSetTool, mode, tol,
      editingPieceId, deleteMode, jetonQuantity, onStartEdit, onStopEdit, onDeleteClick,
      arrowFromId, onSetArrowFrom, onArrowCreated,
      equalizingFromId, onSetEqualizingFromId, groupingBarId, onSetGroupingBarId, selectedPieceId]);

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
      const finalPos = snapBarAlignment(snapped, mode.pieceId, pieces, tol.barAlignSnapMm, referenceUnitMm);
      dispatch({ type: 'MOVE_PIECE_LIVE', id: mode.pieceId, x: finalPos.x, y: finalPos.y });
      return;
    }

    // Hover hit-test for cursor affordance (idle mode only)
    if (!activeTool && !deleteMode) {
      const pos = snapToGrid(rawPos.x, rawPos.y);
      let found: string | null = null;
      for (const piece of pieces) {
        if (hitTest(piece, pos, referenceUnitMm, tol.hitTestPaddingMm, tol.jetonHitPaddingMm, pieces)) {
          found = piece.id;
          break;
        }
      }
      setHoveredPieceId(found);
    }
  }, [mode, pieces, referenceUnitMm, tol, activeTool, deleteMode, _cursorSmoothing, dispatch]);

  // Pointer up — finalize move ONLY for touch/pen (finger lift = put down).
  // Mouse uses click-click (pick up on pointerDown, put down on next pointerDown).
  // This avoids drag-and-drop which requires too much precision for young children.
  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (mode.type !== 'moving' || !svgRef.current) return;
    if (e.pointerType === 'mouse') return; // mouse uses click-click, not drag
    const pos = pointerToMm(e, svgRef.current);
    const adjusted = { x: pos.x - moveOffset.current.dx, y: pos.y - moveOffset.current.dy };
    const snapped = snapToGrid(adjusted.x, adjusted.y);
    const finalPos = snapBarAlignment(snapped, mode.pieceId, pieces, tol.barAlignSnapMm, referenceUnitMm);
    dispatch({ type: 'MOVE_PIECE', id: mode.pieceId, x: finalPos.x, y: finalPos.y });
    setMode({ type: 'idle' });
    originalMovePos.current = null;
  }, [mode, pieces, referenceUnitMm, tol.barAlignSnapMm, dispatch]);

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
    const newJetons: Piece[] = [];
    for (let i = 1; i <= toAdd; i++) {
      newJetons.push({
        id: generateId(),
        type: 'jeton',
        x: source.x + (i % 10) * spacing,
        y: source.y + Math.floor(i / 10) * spacing,
        locked: false,
        couleur: source.couleur,
        parentId: source.parentId, // I2: preserve parentId from source jeton
      });
    }
    dispatch({ type: 'PLACE_PIECES', pieces: newJetons });
    onSelectPiece(null);
  }, [pieces, dispatch, onSelectPiece]);

  // Duplicate bar
  const handleDuplicateBar = useCallback((id: string, count: number) => {
    const source = pieces.find(p => p.id === id);
    if (!source || !isBarre(source)) return;

    const newBars: Piece[] = [];
    for (let i = 1; i <= count; i++) {
      newBars.push({
        id: generateId(),
        type: 'barre',
        x: source.x,
        y: source.y + (BAR_HEIGHT_MM + BAR_VERTICAL_GAP_MM) * i,
        locked: false,
        couleur: source.couleur,
        sizeMultiplier: source.sizeMultiplier,
        label: '',
        value: '', // don't copy value — each bar gets its own
        divisions: null,
        coloredParts: [],
        groupId: null,
        groupLabel: null,
      });
    }
    dispatch({ type: 'PLACE_PIECES', pieces: newBars });
    onSelectPiece(null);
  }, [pieces, dispatch, onSelectPiece]);

  // Edit piece (generic)
  const handleEditPiece = useCallback((id: string, changes: Record<string, unknown>) => {
    dispatch({ type: 'EDIT_PIECE', id, changes });
  }, [dispatch]);

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
        requestAnimationFrame(animate);
      } else {
        // Dispatch first — React re-renders pieces at final coords
        dispatch({ type: 'ARRANGE_PIECES', moves });
        setIsArranging(false);
        // Clean animation transforms AFTER React commit (next frame)
        requestAnimationFrame(() => {
          for (const move of moves) {
            const el = document.querySelector(`[data-piece-id="${move.id}"]`);
            if (el) el.removeAttribute('transform');
          }
        });
      }
    }

    requestAnimationFrame(animate);
  }, [pieces, referenceUnitMm, isArranging, dispatch]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        background: COLORS.canvasBg,
        position: 'relative',
        overflow: 'hidden',
        cursor: getCanvasCursor(activeTool, deleteMode, mode.type === 'moving', !!hoveredPieceId),
      }}
    >
      <svg
        ref={svgRef}
        data-testid="canvas-svg"
        role="application"
        aria-label="Canevas de modélisation"
        viewBox={`0 0 ${CANVAS_WIDTH_MM} ${viewBoxHeight}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleRightClick}
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="#55506A" />
          </marker>
        </defs>

        {/* 3.2: Suggested zones for children with executive function deficits */}
        {/* Zone watermarks — always visible, dimmer with more pieces */}
        <g pointerEvents="none" opacity={(() => {
          const n = pieces.filter(p => !p.locked).length;
          if (n === 0) return 0.5;
          if (showSuggestedZones && n < 3) return 0.4;
          return 0.12;
        })()}>
            {/* Top zone: Modélisation */}
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
              Modélisation
            </text>
            {/* Bottom zone: Calcul et réponse */}
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

        {/* Render pieces */}
        {/* Render boîtes first (background), then everything else on top */}
        {pieces.filter(p => p.type === 'boite').map(piece => (
          <g key={piece.id} data-piece-id={piece.id} className={piece.id === lastPlacedId ? 'piece-new' : undefined}>
            <PieceRenderer piece={piece} referenceUnitMm={referenceUnitMm} isSelected={piece.id === selectedPieceId} />
          </g>
        ))}

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
          return (
            <g key={piece.id} data-piece-id={piece.id}
              className={piece.id === lastPlacedId ? 'piece-new' : undefined}
              style={{ opacity: isMoving ? 0.6 : 1, transition: 'opacity 0.1s' }}
            >
              <PieceRenderer piece={piece} referenceUnitMm={referenceUnitMm} isSelected={piece.id === selectedPieceId} />
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
                <path d={`M${minX},${bracketY} L${minX},${bracketY + 4} L${maxRight},${bracketY + 4} L${maxRight},${bracketY}`}
                  fill="none" stroke="#55506A" strokeWidth={0.5} />
                {labelBar.groupLabel && (
                  <text x={(minX + maxRight) / 2} y={bracketY + 9} textAnchor="middle" fontSize={4.5} fill="#1E1A2E">
                    {labelBar.groupLabel}
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
        let svgFontSizeMm = 5;

        // Determine field to edit
        if (piece.type === 'calcul') {
          initialValue = piece.expression;
          placeholder = '5 + 3 = 8';
          fieldKey = 'expression';
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
        } else if (piece.type === 'barre' && editingBarField === 'value') {
          initialValue = piece.value;
          placeholder = 'Valeur (ex: 45, ?)';
          fieldKey = 'value';
          svgFontSizeMm = 6;
        } else if (piece.type === 'barre') {
          initialValue = piece.label;
          placeholder = 'Nom (ex: Théo)';
          fieldKey = 'label';
        } else if (piece.type === 'boite') {
          initialValue = piece.label;
          placeholder = 'Nom (ex: Ami 1)';
          fieldKey = 'label';
          svgFontSizeMm = 4.5;
        } else if (piece.type === 'etiquette') {
          initialValue = piece.text;
          placeholder = 'Texte...';
          fieldKey = 'text';
        } else if (piece.type === 'fleche') {
          initialValue = piece.label;
          placeholder = 'Texte de la flèche...';
          fieldKey = 'label';
          svgFontSizeMm = 4.5;
        } else {
          return null;
        }

        // Position editor by querying the actual rendered SVG text element.
        // data-edit-target attributes: pieceId for direct text, pieceId-label/value for bar fields.
        const editTargetId = piece.type === 'barre'
          ? `${piece.id}-${editingBarField || 'label'}`
          : piece.id;
        const targetEl = svgEl.querySelector(`[data-edit-target="${editTargetId}"]`);
        const targetRect = targetEl?.getBoundingClientRect();

        if (targetRect && targetRect.width > 0) {
          // Position editor aligned with the SVG text element
          const isRightAligned = piece.type === 'barre' && editingBarField !== 'value';
          if (isRightAligned) {
            // Bar label: text-anchor=end — editor right edge at the text right edge
            editorLeft = targetRect.right - canvasRect.left - 200;
          } else {
            editorLeft = targetRect.left - canvasRect.left;
          }
          // Vertically center on the text element
          const targetCenterY = (targetRect.top + targetRect.bottom) / 2 - canvasRect.top;
          const editorH = Math.max(28, svgFontSizeMm * mmToPx * 1.8);
          editorTop = targetCenterY - editorH / 2;
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

        // Clamp editor position — ensure buttons don't overflow canvas bottom
        const isCalcul = piece.type === 'calcul';
        const editorTotalHeight = isCalcul ? 100 : 40; // input + operator buttons
        editorLeft = Math.max(8, editorLeft);
        editorTop = Math.max(8, Math.min(editorTop, canvasRect.height - editorTotalHeight - 8));

        return (
          <InlineEditor
            key={editingPieceId + fieldKey}
            left={editorLeft}
            top={editorTop}
            initialValue={initialValue}
            placeholder={placeholder}
            isCalcul={isCalcul}
            monospace={isCalcul}
            fontSize={svgFontSizeMm * mmToPx}
            onCommit={(value) => {
              dispatch({ type: 'EDIT_PIECE', id: editingPieceId, changes: { [fieldKey]: value } });
              onStopEdit();
            }}
            onCancel={onStopEdit}
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

      {/* Context actions */}
      {selectedPiece && mode.type === 'idle' && !editingPieceId && (
        <ContextActions
          piece={selectedPiece}
          canvasRect={containerRef.current?.getBoundingClientRect() ?? null}
          svgElement={svgRef.current}
          referenceUnitMm={referenceUnitMm}
          onStartEdit={onStartEdit}
          onStartEditLabel={(id) => { setEditingBarField('label'); onStartEdit(id); }}
          onStartEditValue={(id) => { setEditingBarField('value'); onStartEdit(id); }}
          onStartColumnCalc={(id) => { setColumnCalcPieceId(id); onSelectPiece(null); }}
          onStartDivisionCalc={(id) => { setDivisionCalcPieceId(id); onSelectPiece(null); }}
          onResizeBar={handleResizeBar}
          onDuplicateBar={handleDuplicateBar}
          onChangeColor={handleChangeColor}
          onDuplicateJetons={handleDuplicateJetons}
          onEditPiece={handleEditPiece}
          onStartEqualizing={handleStartEqualizing}
          onStartGrouping={handleStartGrouping}
          onUngroup={handleUngroup}
          onDismiss={() => onSelectPiece(null)}
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
        // Restore saved column data if available
        const rawData = piece.columnData ? JSON.parse(piece.columnData) : undefined;
        const savedData = rawData?.type === 'division' ? undefined : rawData as ColumnCalcData | undefined;

        return (
          <ColumnCalc
            left={Math.max(8, ptTop.x - cr.left)}
            top={8}
            initialOp1={parsed?.op1}
            initialOp2={parsed?.op2}
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
        const initialDividend = !savedData && parsed?.operator === '÷' ? parsed.op1 : (!savedData && parsed ? parsed.op1 : undefined);
        const initialDivisor = !savedData && parsed?.operator === '÷' ? parsed.op2 : (!savedData && parsed ? parsed.op2 : undefined);

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

      {/* Jeton counter by color — supports dyscalculia */}
      {(() => {
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

      {/* R7: Ranger floating button */}
      {pieces.some(p => !p.locked) && (
        <button
          onClick={handleArrange}
          disabled={isArranging}
          title="Ranger les pièces"
          aria-label="Ranger les pièces"
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            width: 44,
            height: 44,
            borderRadius: 8,
            background: '#fff',
            border: '1px solid #D5D0E0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            cursor: isArranging ? 'wait' : 'pointer',
            opacity: isArranging ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: '#55506A',
            zIndex: 10,
          }}
        >
          ☰
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

function PieceRenderer({ piece, referenceUnitMm, isSelected }: {
  piece: Piece;
  referenceUnitMm: number;
  isSelected: boolean;
}) {
  switch (piece.type) {
    case 'barre':
      return <BarrePiece piece={piece} referenceUnitMm={referenceUnitMm} isSelected={isSelected} />;
    case 'jeton':
      return <JetonPiece piece={piece} isSelected={isSelected} />;
    case 'boite':
      return <BoitePiece piece={piece} isSelected={isSelected} />;
    case 'etiquette':
      return <EtiquettePiece piece={piece} isSelected={isSelected} />;
    case 'calcul':
      return <CalculPiece piece={piece} isSelected={isSelected} />;
    case 'reponse':
      return <ReponsePiece piece={piece} isSelected={isSelected} />;
    case 'droiteNumerique':
      return <DroiteNumeriquePiece piece={piece as DroiteNumerique} isSelected={isSelected} />;
    case 'fleche':
      return null; // arrows are rendered in a separate layer above
    default:
      return null;
  }
}

function JetonPiece({ piece, isSelected }: { piece: Piece & { type: 'jeton' }; isSelected: boolean }) {
  const r = 4;
  const color = getPieceColor(piece.couleur);
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
  const w = Math.max(30, piece.text.length * 4 + 8);
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
        fontSize={5}
        fill="#1E1A2E"
        data-edit-target={piece.id}
      >
        {piece.text || '…'}
      </text>
    </g>
  );
}

function BoitePiece({ piece, isSelected }: { piece: Piece & { type: 'boite' }; isSelected: boolean }) {
  return (
    <g>
      <rect
        x={piece.x} y={piece.y} width={piece.width} height={piece.height}
        rx={2} fill={isSelected ? 'rgba(112, 40, 224, 0.06)' : 'rgba(156,163,175,0.05)'}
        stroke={isSelected ? '#7028e0' : '#9CA3AF'}
        strokeWidth={isSelected ? 1.5 : 0.5}
        strokeDasharray={isSelected ? undefined : '3 2'}
      />
      {/* Label at top (always render for edit target positioning) */}
      <text
        x={piece.x + 4} y={piece.y - 3}
        fontSize={4.5} fill={piece.label ? '#55506A' : 'transparent'}
        data-testid="boite-label"
        data-edit-target={piece.id}
      >
        {piece.label || ' '}
      </text>
      {isSelected && (
        <rect
          x={piece.x - 1} y={piece.y - 1}
          width={piece.width + 2} height={piece.height + 2}
          rx={3} fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={1}
        />
      )}
    </g>
  );
}

function CalculPiece({ piece, isSelected }: {
  piece: Piece & { type: 'calcul' };
  isSelected: boolean;
}) {
  const displayText = formatExpr(piece.expression) || '…';
  const w = Math.max(80, piece.expression.length * 5 + 10);
  const h = 14;

  return (
    <g>
      <rect
        x={piece.x} y={piece.y} width={w} height={h} rx={2}
        fill={COLORS.calculBg}
        stroke={isSelected ? COLORS.primary : COLORS.calculBorder}
        strokeWidth={0.5}
      />
      <text
        x={piece.x + 4} y={piece.y + h / 2}
        dominantBaseline="central" fontSize={5}
        fontFamily="'Consolas', 'Courier New', monospace"
        fill={piece.expression ? COLORS.text : '#9CA3AF'}
        data-edit-target={piece.id}
      >
        {displayText}
      </text>
    </g>
  );
}

function ReponsePiece({ piece, isSelected }: {
  piece: Piece & { type: 'reponse' };
  isSelected: boolean;
}) {
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
    const w = Math.max(120, templateText.length * 3.2 + 20);
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
        <text x={piece.x + 4} y={piece.y + 6} fontSize={4} fill={COLORS.primary}>
          Réponse (à trous)
        </text>
        <text x={piece.x + 4} y={piece.y + 16} fontSize={5} data-edit-target={piece.id}>
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
  const w = Math.max(100, piece.text.length * 4 + 20);
  const h = 22;

  return (
    <g>
      <rect
        x={piece.x} y={piece.y} width={w} height={h} rx={2}
        fill="#fff"
        stroke={COLORS.reponseBorder}
        strokeWidth={isSelected ? 1 : 0.7}
      />
      <text x={piece.x + 4} y={piece.y + 6} fontSize={5} fill={COLORS.primary}>
        Réponse
      </text>
      <text x={piece.x + 4} y={piece.y + 16} fontSize={5} fill={piece.text ? COLORS.text : '#9CA3AF'}
        data-edit-target={piece.id}>
        {piece.text || '…'}
      </text>
    </g>
  );
}

// Inline editor — rendered as HTML overlay above the SVG
function InlineEditor({ left, top, initialValue, placeholder, isCalcul, fontSize = 14, monospace, onCommit, onCancel, onColumnCalc, onDivisionCalc }: {
  left: number; top: number;
  initialValue: string; placeholder: string;
  isCalcul?: boolean;
  fontSize?: number;
  monospace?: boolean;
  onCommit: (value: string) => void;
  onCancel: () => void;
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
    if (committed.current) return; // prevent double commit
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

  return (
    <div
      style={{ position: 'absolute', left, top, zIndex: 20 }}
      onPointerDown={e => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        data-testid="inline-editor"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { commit(); e.stopPropagation(); }
          if (e.key === 'Escape') { onCancel(); e.stopPropagation(); }
        }}
        onBlur={e => {
          // Don't commit if clicking on operator buttons
          if (e.relatedTarget && (e.relatedTarget as HTMLElement).dataset?.operatorBtn) return;
          commit();
        }}
        style={{
          minWidth: 200,
          height: Math.max(28, fontSize * 1.8),
          border: '2px solid #7028e0',
          borderRadius: 6,
          padding: '2px 6px',
          fontSize: Math.round(fontSize),
          fontFamily: monospace ? "'Consolas', 'Courier New', monospace" : 'inherit',
          background: '#fff',
          outline: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      />
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
                  // Route to DivisionCalc if expression contains ÷, else ColumnCalc
                  if (onDivisionCalc && (inputRef.current?.value?.includes('÷') || inputRef.current?.value?.includes('/'))) {
                    onDivisionCalc();
                  } else {
                    onColumnCalc();
                  }
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

// Parse an expression like "28 × 4 = 112" into components
function parseExpression(expr: string): { op1: string; op2: string; operator: string; result: string } | null {
  if (!expr) return null;
  // Normalize operators
  const normalized = expr.replace(/×/g, '*').replace(/x/gi, '*').replace(/÷/g, '/').replace(/−/g, '-');
  // Match: number operator number = number
  const match = normalized.match(/^\s*(\d+)\s*([+\-*/])\s*(\d+)\s*(?:=\s*(\d+))?\s*$/);
  if (!match) return null;
  const opMap: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  return {
    op1: match[1],
    op2: match[3],
    operator: opMap[match[2]] || '+',
    result: match[4] || '',
  };
}

// === Reponse width helper ===

function getReponseWidth(piece: Reponse): number {
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
    return Math.max(120, templateText.length * 3.2 + 20);
  }
  return Math.max(100, piece.text.length * 4 + 20);
}

// === Hit test ===

function hitTest(piece: Piece, pos: { x: number; y: number }, refUnit: number, padding = 0, jetonPadding = 0, pieces: Piece[] = []): boolean {
  const p = padding; // additive padding (mm) for tolerance profiles
  switch (piece.type) {
    case 'jeton': {
      const dx = pos.x - piece.x;
      const dy = pos.y - piece.y;
      return Math.sqrt(dx * dx + dy * dy) <= 9 + jetonPadding;
    }
    case 'barre': {
      const w = piece.sizeMultiplier * refUnit;
      return pos.x >= piece.x - p && pos.x <= piece.x + w + p &&
             pos.y >= piece.y - p && pos.y <= piece.y + BAR_HEIGHT_MM + p;
    }
    case 'etiquette': {
      const ew = Math.max(30, piece.text.length * 4 + 8);
      return pos.x >= piece.x - 2 - p && pos.x <= piece.x + ew + p &&
             pos.y >= piece.y - 7 - p && pos.y <= piece.y + 3 + p;
    }
    case 'boite': {
      return pos.x >= piece.x - p && pos.x <= piece.x + piece.width + p &&
             pos.y >= piece.y - p && pos.y <= piece.y + piece.height + p;
    }
    case 'calcul': {
      const w = Math.max(80, piece.expression.length * 5 + 10);
      return pos.x >= piece.x - p && pos.x <= piece.x + w + p &&
             pos.y >= piece.y - p && pos.y <= piece.y + 12 + p;
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

function getPieceCenter(piece: Piece, referenceUnitMm: number): { x: number; y: number } {
  switch (piece.type) {
    case 'jeton': return { x: piece.x, y: piece.y };
    case 'barre': return { x: piece.x + (piece.sizeMultiplier * referenceUnitMm) / 2, y: piece.y + BAR_HEIGHT_MM / 2 };
    case 'boite': return { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 };
    case 'calcul': return { x: piece.x + Math.max(80, piece.expression.length * 5 + 10) / 2, y: piece.y + 7 };
    case 'reponse': return { x: piece.x + getReponseWidth(piece) / 2, y: piece.y + 11 };
    case 'etiquette': return { x: piece.x + Math.max(30, piece.text.length * 4 + 8) / 2, y: piece.y - 2 };
    case 'droiteNumerique': return { x: piece.x + (piece as DroiteNumerique).width / 2, y: piece.y };
    default: return { x: piece.x, y: piece.y };
  }
}

/** Get the point on the edge of a piece's bounding box closest to a target point. */
function getEdgePoint(piece: Piece, target: { x: number; y: number }, refUnit: number): { x: number; y: number } {
  let bx: number, by: number, bw: number, bh: number;
  switch (piece.type) {
    case 'jeton': return { x: piece.x, y: piece.y }; // circle — center is fine
    case 'barre': bx = piece.x; by = piece.y; bw = piece.sizeMultiplier * refUnit; bh = BAR_HEIGHT_MM; break;
    case 'boite': bx = piece.x; by = piece.y; bw = piece.width; bh = piece.height; break;
    case 'calcul': bx = piece.x; by = piece.y; bw = Math.max(80, piece.expression.length * 5 + 10); bh = 12; break;
    case 'reponse': bx = piece.x; by = piece.y; bw = getReponseWidth(piece); bh = 22; break;
    case 'etiquette': bx = piece.x; by = piece.y - 7; bw = Math.max(30, piece.text.length * 4 + 8); bh = 10; break;
    case 'droiteNumerique': bx = piece.x; by = piece.y - 10; bw = (piece as DroiteNumerique).width; bh = 20; break;
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

function createPiece(tool: NonNullable<ToolType>, pos: { x: number; y: number }): Piece | null {
  const id = generateId();
  switch (tool) {
    case 'jeton':
      return { id, type: 'jeton', x: pos.x, y: pos.y, locked: false, couleur: 'bleu', parentId: null };
    case 'barre':
      return { id, type: 'barre', x: pos.x, y: pos.y, locked: false, couleur: 'bleu', sizeMultiplier: 1, label: '', value: '', divisions: null, coloredParts: [], groupId: null, groupLabel: null };
    case 'boite':
      return { id, type: 'boite', x: pos.x, y: pos.y, locked: false, width: 60, height: 40, label: '' };
    case 'etiquette':
      return { id, type: 'etiquette', x: pos.x, y: pos.y, locked: false, text: '', attachedTo: null };
    case 'calcul':
      return { id, type: 'calcul', x: pos.x, y: pos.y, locked: false, expression: '' };
    case 'reponse':
      return { id, type: 'reponse', x: pos.x, y: pos.y, locked: false, text: '', template: null };
    case 'droiteNumerique':
      return { id, type: 'droiteNumerique', x: pos.x, y: pos.y, locked: false,
        min: 0, max: 10, step: 1, markers: [], width: 200 };
    case 'fleche':
      return null; // fleche uses two-click placement, not createPiece
    case 'deplacer':
      return null; // deplacer is not a placement tool
  }
}
