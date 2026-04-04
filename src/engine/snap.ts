import type { Piece } from '../model/types';
import { BAR_HEIGHT_MM, isBarre } from '../model/types';

/**
 * Snap a position to align with existing bars (left-align).
 * If the new position is within barAlignSnapMm vertically of another bar,
 * snap the x to match the other bar's x.
 */
export interface SnapResult {
  x: number;
  y: number;
  /** true when position was snapped to align with another bar */
  aligned: boolean;
  /** Y coordinate of the reference bar's left edge (for rendering alignment guide) */
  alignRefY?: number;
}

export function snapBarAlignment(
  pos: { x: number; y: number },
  pieceId: string,
  pieces: Piece[],
  barAlignSnapMm: number,
  _referenceUnitMm?: number,
): SnapResult {
  let { x, y } = pos;
  let aligned = false;
  let alignRefY: number | undefined;

  // Find other bars to align with
  const otherBars = pieces.filter(p => isBarre(p) && p.id !== pieceId);

  for (const bar of otherBars) {
    // Check if vertically close (within snap range)
    const verticalDist = Math.abs(y - bar.y);
    if (verticalDist < barAlignSnapMm + BAR_HEIGHT_MM) {
      // Snap x to match
      if (Math.abs(x - bar.x) < barAlignSnapMm) {
        x = bar.x;
        aligned = true;
        alignRefY = bar.y;
      }
    }
  }

  return { x, y, aligned, alignRefY };
}
