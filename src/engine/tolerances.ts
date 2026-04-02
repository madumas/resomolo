import {
  SNAP_GRID_MM, BAR_ALIGN_SNAP_MM, DRAG_THRESHOLD_MM,
  CLICK_DEBOUNCE_MS, JETON_SPACING_MM,
} from '../model/types';
import type { ToleranceProfile } from '../model/types';
import { getToleranceMultiplier } from '../model/types';

export interface Tolerances {
  snapGridMm: number;
  barAlignSnapMm: number;
  dragThresholdMm: number;
  clickDebounceMs: number;
  /** Additive padding for hit tests on non-jeton pieces (mm). */
  hitTestPaddingMm: number;
  /** Additive padding for jeton hit tests (mm). Capped to avoid overlap at JETON_SPACING_MM. */
  jetonHitPaddingMm: number;
}

/** Max jeton padding so that two adjacent jetons' hit zones don't overlap.
 * Hit test uses radius 7mm (larger than visual JETON_DIAMETER/2 for accessibility).
 * (7 + padding) * 2 < JETON_SPACING → padding < JETON_SPACING/2 - 7
 */
const JETON_HIT_RADIUS = 9; // mm — larger than visual for accessibility
const MAX_JETON_PADDING = Math.max(0, JETON_SPACING_MM / 2 - JETON_HIT_RADIUS - 0.1);

export function getTolerances(profile: ToleranceProfile): Tolerances {
  const m = getToleranceMultiplier(profile);
  const rawPadding = (m - 1) * 3; // 0mm normal, 1.5mm large, 3mm tres-large
  return {
    snapGridMm: SNAP_GRID_MM,            // grid spacing does NOT scale
    barAlignSnapMm: BAR_ALIGN_SNAP_MM * m,
    dragThresholdMm: DRAG_THRESHOLD_MM * m,
    clickDebounceMs: Math.round(CLICK_DEBOUNCE_MS * Math.sqrt(m)),
    hitTestPaddingMm: rawPadding,
    jetonHitPaddingMm: Math.min(rawPadding, MAX_JETON_PADDING),
  };
}
