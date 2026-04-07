import type { Piece, Fleche } from '../model/types';
import { BAR_HEIGHT_MM, JETON_DIAMETER_MM } from '../model/types';

const V_GAP = 15; // mm vertical gap between groups
const H_GAP = 10; // mm horizontal gap between pieces in a row
const MARGIN = 15; // mm from canvas edge
const CANVAS_MAX_X = 470; // mm (CANVAS_WIDTH_MM - 2*margin)

export interface ArrangementMove {
  id: string;
  x: number;
  y: number;
}

/** Layout order: barres top, boîtes (with their jetons), free jetons, étiquettes, calculs, réponse bottom. */
const LAYOUT_ORDER = ['barre', 'schema', 'droiteNumerique', 'arbre', 'boite', 'jeton', 'tableau', 'diagrammeBandes', 'diagrammeLigne', 'inconnue', 'etiquette', 'calcul', 'reponse'] as const;

/**
 * Compute new positions for all movable pieces.
 * - Locked pieces are not moved.
 * - Jetons inside boîtes (parentId) move with their boîte, not independently.
 * - Free jetons are sub-grouped by color.
 * - Flèches are skipped (they follow their attached pieces).
 */
export function computeArrangement(pieces: Piece[], referenceUnitMm: number, maxHeight = 350): ArrangementMove[] {
  // Identify jetons parented to a boîte — they move with the boîte
  const parentedJetonIds = new Set(
    pieces.filter(p => p.type === 'jeton' && (p as any).parentId).map(p => p.id)
  );

  const movable = pieces.filter(p => !p.locked && p.type !== 'fleche' && !parentedJetonIds.has(p.id));
  if (movable.length === 0) return [];

  // Group by type
  const groups = new Map<string, Piece[]>();
  for (const p of movable) {
    const list = groups.get(p.type) || [];
    list.push(p);
    groups.set(p.type, list);
  }

  // Sub-sort free jetons by color for visual grouping
  const jetons = groups.get('jeton');
  if (jetons) {
    const colorOrder: Record<string, number> = { bleu: 0, rouge: 1, vert: 2, jaune: 3 };
    jetons.sort((a, b) => {
      const ca = colorOrder[(a as any).couleur] ?? 9;
      const cb = colorOrder[(b as any).couleur] ?? 9;
      if (ca !== cb) return ca - cb;
      return a.y - b.y || a.x - b.x;
    });
  }

  // Build set of piece IDs connected by fleches — add extra spacing between them
  const flecheConnected = new Set<string>();
  for (const p of pieces) {
    if (p.type === 'fleche') {
      const f = p as Fleche;
      flecheConnected.add(f.fromId);
      flecheConnected.add(f.toId);
    }
  }

  // Try layout with decreasing vertical gaps until it fits
  for (const vGap of [V_GAP, 8, 4, 2]) {
    const moves = layoutWithGap(groups, referenceUnitMm, vGap, flecheConnected);
    const maxY = moves.reduce((m, mv) => Math.max(m, mv.y), 0);
    if (maxY < maxHeight - MARGIN || vGap === 2) {
      // Clamp: if content still overflows, compress vertically to fit
      if (maxY >= maxHeight - MARGIN) {
        const contentHeight = maxY - MARGIN;
        const availableHeight = maxHeight - 2 * MARGIN;
        if (contentHeight > 0 && availableHeight > 0) {
          const scale = availableHeight / contentHeight;
          for (const m of moves) {
            m.y = MARGIN + (m.y - MARGIN) * scale;
          }
        }
      }
      addParentedJetons(pieces, moves, parentedJetonIds);
      return moves;
    }
  }
  return [];
}

function layoutWithGap(
  groups: Map<string, Piece[]>,
  referenceUnitMm: number,
  vGap: number,
  flecheConnected: Set<string>,
): ArrangementMove[] {
  const moves: ArrangementMove[] = [];
  let currentX = MARGIN;
  let currentY = MARGIN;
  let rowMaxHeight = 0;
  const FLECHE_EXTRA = 30; // extra horizontal space between fleche-connected pieces

  for (const type of LAYOUT_ORDER) {
    const group = groups.get(type);
    if (!group || group.length === 0) continue;

    if (type !== 'jeton') {
      group.sort((a, b) => a.y - b.y || a.x - b.x);
    }

    for (const piece of group) {
      const w = getPieceWidth(piece, referenceUnitMm);
      const h = getPieceHeight(piece);

      if (currentX + w > CANVAS_MAX_X && currentX > MARGIN) {
        currentX = MARGIN;
        currentY += rowMaxHeight + vGap;
        rowMaxHeight = 0;
      }

      // Réponse: align right on its row
      const px = type === 'reponse' ? Math.max(currentX, CANVAS_MAX_X - w) : currentX;
      moves.push({ id: piece.id, x: px, y: currentY });
      const extra = flecheConnected.has(piece.id) ? FLECHE_EXTRA : 0;
      currentX += w + H_GAP + extra;
      rowMaxHeight = Math.max(rowMaxHeight, h);
    }
  }

  return moves;
}

/** Move parented jetons with their boîte — preserve relative offset */
function addParentedJetons(
  pieces: Piece[],
  moves: ArrangementMove[],
  parentedJetonIds: Set<string>,
): void {
  const moveMap = new Map(moves.map(m => [m.id, m]));

  for (const p of pieces) {
    if (!parentedJetonIds.has(p.id)) continue;
    const parentId = (p as any).parentId as string;
    const parent = pieces.find(pp => pp.id === parentId);
    const parentMove = moveMap.get(parentId);
    if (!parent || !parentMove) continue;

    // Preserve offset from parent
    const dx = p.x - parent.x;
    const dy = p.y - parent.y;
    moves.push({ id: p.id, x: parentMove.x + dx, y: parentMove.y + dy });
  }
}

function getPieceWidth(piece: Piece, referenceUnitMm: number): number {
  switch (piece.type) {
    case 'barre': return piece.sizeMultiplier * referenceUnitMm;
    case 'droiteNumerique': return (piece as any).width;
    case 'jeton': return JETON_DIAMETER_MM;
    case 'boite': return piece.width;
    case 'etiquette': return Math.max(30, piece.text.length * 4 + 8);
    case 'inconnue': return 12;
    case 'diagrammeBandes':
    case 'diagrammeLigne': return (piece as any).width || 120;
    case 'calcul': return Math.max(60, piece.expression.length * 5 + 10);
    case 'reponse': return Math.max(100, piece.text.length * 4 + 20);
    case 'tableau': return (piece as any).cols * 12;
    case 'arbre': {
      const levels = (piece as any).levels || [];
      const leafCount = levels.reduce((acc: number, l: any) => acc * Math.max(1, (l.options || []).length), 1);
      return Math.max(60, Math.min(24, leafCount) * 28);
    }
    case 'schema': {
      const bars = (piece as any).bars || [];
      const maxSm = bars.reduce((m: number, b: any) => Math.max(m, b.sizeMultiplier || 1), 1);
      return maxSm * referenceUnitMm;
    }
    default: return 30;
  }
}

function getPieceHeight(piece: Piece): number {
  switch (piece.type) {
    case 'barre': return BAR_HEIGHT_MM;
    case 'droiteNumerique': return 20;
    case 'jeton': return JETON_DIAMETER_MM;
    case 'boite': return piece.height;
    case 'etiquette': return 10;
    case 'inconnue': return 12;
    case 'diagrammeBandes':
    case 'diagrammeLigne': return (piece as any).height || 90;
    case 'calcul': return 12;
    case 'reponse': return 22;
    case 'tableau': return (piece as any).rows * 10;
    case 'arbre': {
      const levels = (piece as any).levels || [];
      return Math.max(12, levels.length * 30);
    }
    case 'schema': {
      const bars = (piece as any).bars || [];
      return Math.max(15, bars.length * 23);
    }
    default: return 10;
  }
}
