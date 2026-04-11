import type { Bond, DroiteNumerique } from '../model/types';

// --- Snap ---

/** Snap a value to the nearest step within [min, max]. Guards against step=0. */
export function snapToStep(val: number, min: number, max: number, step: number): number {
  const safeStep = Math.max(0.1, step);
  const clamped = Math.max(min, Math.min(max, val));
  return Math.round((clamped - min) / safeStep) * safeStep + min;
}

// --- Auto-label ---

export function computeAutoLabel(toolbarMode: 'essentiel' | 'complet', from: number, to: number): string {
  const diff = to - from;
  if (toolbarMode === 'essentiel') {
    return `${Math.abs(diff)}`;
  }
  return diff >= 0 ? `+${diff}` : `${diff}`;
}

// --- Bond path geometry ---

export interface BondPathInfo {
  path: string;
  midX: number;
  cpY: number;
  direction: -1 | 1; // -1 = above (positive), 1 = below (negative)
  arcHeight: number;
  level: number;
}

export function getBondLevel(bond: Bond, allBonds: Bond[]): number {
  const isPositive = bond.to >= bond.from;
  const lo = Math.min(bond.from, bond.to);
  const hi = Math.max(bond.from, bond.to);

  const sameDirBonds = allBonds.filter(b => {
    if (b === bond) return false;
    const bPositive = b.to >= b.from;
    if (bPositive !== isPositive) return false;
    const bLo = Math.min(b.from, b.to);
    const bHi = Math.max(b.from, b.to);
    return Math.max(lo, bLo) < Math.min(hi, bHi); // overlap
  });

  // Greedy: assign the smallest level not occupied by overlapping same-dir bonds
  // We need stable levels for all bonds, so compute for all same-dir overlapping bonds first
  const usedLevels = new Set<number>();
  for (const b of sameDirBonds) {
    // Compute level for each overlapping bond recursively would be expensive;
    // instead, use a simple index-based approach: bonds earlier in the array get lower levels
    const bIdx = allBonds.indexOf(b);
    const bondIdx = allBonds.indexOf(bond);
    if (bIdx < bondIdx) {
      usedLevels.add(getBondLevel(b, allBonds));
    }
  }
  let level = 0;
  while (usedLevels.has(level)) level++;
  return level;
}

/** Compute all bond levels at once (avoids repeated recursive calls). */
export function computeAllBondLevels(bonds: Bond[]): number[] {
  const levels: number[] = new Array(bonds.length).fill(0);
  for (let i = 0; i < bonds.length; i++) {
    const bond = bonds[i];
    const isPositive = bond.to >= bond.from;
    const lo = Math.min(bond.from, bond.to);
    const hi = Math.max(bond.from, bond.to);

    const usedLevels = new Set<number>();
    for (let j = 0; j < i; j++) {
      const b = bonds[j];
      const bPositive = b.to >= b.from;
      if (bPositive !== isPositive) continue;
      const bLo = Math.min(b.from, b.to);
      const bHi = Math.max(b.from, b.to);
      if (Math.max(lo, bLo) < Math.min(hi, bHi)) {
        usedLevels.add(levels[j]);
      }
    }
    let level = 0;
    while (usedLevels.has(level)) level++;
    levels[i] = level;
  }
  return levels;
}

export function computeBondPath(
  bond: Bond,
  piece: Pick<DroiteNumerique, 'x' | 'y' | 'min' | 'max' | 'width'>,
  level: number,
): BondPathInfo {
  const { x, y, min, max, width } = piece;
  const range = max - min;
  if (range <= 0) {
    return { path: '', midX: x, cpY: y, direction: -1, arcHeight: 0, level };
  }

  const x1 = x + ((bond.from - min) / range) * width;
  const x2 = x + ((bond.to - min) / range) * width;
  const midX = (x1 + x2) / 2;

  const dist = Math.abs(x2 - x1);
  const baseArcHeight = Math.max(8, Math.min(dist * 0.4, 30));
  const arcHeight = baseArcHeight * (1 + 0.5 * Math.min(level, 3)); // compress after level 3

  const direction: -1 | 1 = bond.to >= bond.from ? -1 : 1;
  const cpY = y + direction * arcHeight;

  const path = `M ${x1} ${y} Q ${midX} ${cpY} ${x2} ${y}`;

  return { path, midX, cpY, direction, arcHeight, level };
}

// --- Implicit markers ---

export function getImplicitMarkers(bonds: Bond[]): number[] {
  const vals = new Set<number>();
  for (const b of bonds) {
    vals.add(b.from);
    vals.add(b.to);
  }
  return [...vals].sort((a, b) => a - b);
}

// --- Range/step change helpers ---

export function filterBondsOnRangeChange(bonds: Bond[], newMin: number, newMax: number): Bond[] {
  return bonds.filter(b => b.from >= newMin && b.from <= newMax && b.to >= newMin && b.to <= newMax);
}

export function snapBondsToStep(bonds: Bond[], newStep: number, min: number, max: number, toolbarMode: 'essentiel' | 'complet'): Bond[] {
  return bonds.map(b => {
    const from = snapToStep(b.from, min, max, newStep);
    const to = snapToStep(b.to, min, max, newStep);
    if (from === to) return null; // collapsed to zero-length — remove
    const label = computeAutoLabel(toolbarMode, from, to);
    return { from, to, label };
  }).filter((b): b is Bond => b !== null);
}

// --- Nudge detection ---

/** Returns true if the last `count` bonds are all unitary (size = 1 step) in the same direction. */
export function isUnitaryChain(bonds: Bond[], step: number, count = 3): boolean {
  if (bonds.length < count) return false;
  const safeStep = Math.max(0.1, step);
  const tail = bonds.slice(-count);
  return tail.every(b => Math.abs(Math.abs(b.to - b.from) - safeStep) < 1e-6);
}

// --- Marker label collision ---

/** Check if a marker at `val` is covered by a positive bond arc (above the line). */
export function isMarkerCoveredByPositiveBond(val: number, bonds: Bond[]): boolean {
  return bonds.some(b => {
    if (b.to < b.from) return false; // negative bond = below, no collision with top labels
    const lo = Math.min(b.from, b.to);
    const hi = Math.max(b.from, b.to);
    return val >= lo && val <= hi;
  });
}
