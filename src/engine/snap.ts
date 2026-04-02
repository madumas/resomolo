import type { Piece } from '../model/types';
import { BAR_HEIGHT_MM, isBarre } from '../model/types';

/**
 * Snap a position to align with existing bars (left-align).
 * If the new position is within barAlignSnapMm vertically of another bar,
 * snap the x to match the other bar's x.
 */
export function snapBarAlignment(
  pos: { x: number; y: number },
  pieceId: string,
  pieces: Piece[],
  barAlignSnapMm: number,
  _referenceUnitMm?: number,
): { x: number; y: number } {
  let { x, y } = pos;

  // Find other bars to align with
  const otherBars = pieces.filter(p => isBarre(p) && p.id !== pieceId);

  for (const bar of otherBars) {
    // Check if vertically close (within snap range)
    const verticalDist = Math.abs(y - bar.y);
    if (verticalDist < barAlignSnapMm + BAR_HEIGHT_MM) {
      // Snap x to match
      if (Math.abs(x - bar.x) < barAlignSnapMm) {
        x = bar.x;
      }
    }
  }

  return { x, y };
}
