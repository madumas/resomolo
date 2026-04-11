import { describe, test, expect } from 'vitest';
import {
  snapToStep,
  computeAutoLabel,
  computeAllBondLevels,
  computeBondPath,
  getImplicitMarkers,
  filterBondsOnRangeChange,
  snapBondsToStep,
  isUnitaryChain,
  isMarkerCoveredByPositiveBond,
} from '../bonds';
import type { Bond } from '../../model/types';

// --- snapToStep ---

describe('snapToStep', () => {
  test('basic snap', () => {
    expect(snapToStep(3.7, 0, 10, 1)).toBe(4);
    expect(snapToStep(3.2, 0, 10, 1)).toBe(3);
  });

  test('clamps to [min, max]', () => {
    expect(snapToStep(-5, 0, 10, 1)).toBe(0);
    expect(snapToStep(15, 0, 10, 1)).toBe(10);
  });

  test('step=0 guarded to 0.1', () => {
    expect(snapToStep(0.5, 0, 1, 0)).toBeCloseTo(0.5, 1);
  });

  test('snap with step=2', () => {
    expect(snapToStep(3, 0, 10, 2)).toBe(4);
    expect(snapToStep(2.9, 0, 10, 2)).toBe(2);
  });

  test('snap with step=5', () => {
    expect(snapToStep(7, 0, 20, 5)).toBe(5);
    expect(snapToStep(8, 0, 20, 5)).toBe(10);
  });

  test('negative range', () => {
    expect(snapToStep(-3, -10, 10, 1)).toBe(-3);
    expect(snapToStep(-7.6, -10, 10, 1)).toBe(-8);
  });
});

// --- computeAutoLabel ---

describe('computeAutoLabel', () => {
  test('essentiel positive', () => {
    expect(computeAutoLabel('essentiel', 3, 7)).toBe('4');
  });

  test('essentiel negative', () => {
    expect(computeAutoLabel('essentiel', 10, 6)).toBe('4');
  });

  test('complet positive', () => {
    expect(computeAutoLabel('complet', 3, 7)).toBe('+4');
  });

  test('complet negative', () => {
    expect(computeAutoLabel('complet', 10, 6)).toBe('-4');
  });

  test('zero distance', () => {
    expect(computeAutoLabel('essentiel', 5, 5)).toBe('0');
    expect(computeAutoLabel('complet', 5, 5)).toBe('+0');
  });

  test('large number', () => {
    expect(computeAutoLabel('complet', 0, 100)).toBe('+100');
  });
});

// --- computeAllBondLevels ---

describe('computeAllBondLevels', () => {
  test('no overlap — all level 0', () => {
    const bonds: Bond[] = [
      { from: 0, to: 3, label: '3' },
      { from: 5, to: 8, label: '3' },
    ];
    expect(computeAllBondLevels(bonds)).toEqual([0, 0]);
  });

  test('simple overlap — levels 0 and 1', () => {
    const bonds: Bond[] = [
      { from: 0, to: 5, label: '5' },
      { from: 3, to: 8, label: '5' },
    ];
    expect(computeAllBondLevels(bonds)).toEqual([0, 1]);
  });

  test('triple overlap', () => {
    const bonds: Bond[] = [
      { from: 0, to: 10, label: '10' },
      { from: 2, to: 8, label: '6' },
      { from: 4, to: 6, label: '2' },
    ];
    expect(computeAllBondLevels(bonds)).toEqual([0, 1, 2]);
  });

  test('opposite directions do not stack', () => {
    const bonds: Bond[] = [
      { from: 3, to: 7, label: '4' },   // positive (above)
      { from: 8, to: 4, label: '4' },   // negative (below)
    ];
    expect(computeAllBondLevels(bonds)).toEqual([0, 0]);
  });

  test('negative bonds that overlap stack together', () => {
    const bonds: Bond[] = [
      { from: 10, to: 5, label: '5' },  // negative
      { from: 8, to: 3, label: '5' },   // negative, overlaps
    ];
    expect(computeAllBondLevels(bonds)).toEqual([0, 1]);
  });
});

// --- computeBondPath ---

describe('computeBondPath', () => {
  const piece = { x: 0, y: 100, min: 0, max: 10, width: 200 };

  test('positive bond — arc above (direction -1)', () => {
    const info = computeBondPath({ from: 3, to: 7, label: '4' }, piece, 0);
    expect(info.direction).toBe(-1);
    expect(info.cpY).toBeLessThan(100);
    expect(info.path).toContain('M');
    expect(info.path).toContain('Q');
  });

  test('negative bond — arc below (direction 1)', () => {
    const info = computeBondPath({ from: 7, to: 3, label: '4' }, piece, 0);
    expect(info.direction).toBe(1);
    expect(info.cpY).toBeGreaterThan(100);
  });

  test('arcHeight floor is 8mm', () => {
    // Bond of 1 step on a 200mm wide line: dist = 20mm, 0.4*20 = 8, so floor = 8
    const info = computeBondPath({ from: 0, to: 1, label: '1' }, piece, 0);
    expect(info.arcHeight).toBeGreaterThanOrEqual(8);
  });

  test('arcHeight ceiling is 30mm at level 0', () => {
    const info = computeBondPath({ from: 0, to: 10, label: '10' }, piece, 0);
    expect(info.arcHeight).toBeLessThanOrEqual(30);
  });

  test('level increases arcHeight', () => {
    const info0 = computeBondPath({ from: 0, to: 5, label: '5' }, piece, 0);
    const info1 = computeBondPath({ from: 0, to: 5, label: '5' }, piece, 1);
    expect(info1.arcHeight).toBeGreaterThan(info0.arcHeight);
  });

  test('level compression after 3', () => {
    const info3 = computeBondPath({ from: 0, to: 5, label: '5' }, piece, 3);
    const info4 = computeBondPath({ from: 0, to: 5, label: '5' }, piece, 4);
    // Both should use min(level, 3) = 3
    expect(info3.arcHeight).toBe(info4.arcHeight);
  });

  test('degenerate range returns empty path', () => {
    const degeneratePiece = { x: 0, y: 100, min: 10, max: 5, width: 200 };
    const info = computeBondPath({ from: 5, to: 8, label: '3' }, degeneratePiece, 0);
    expect(info.path).toBe('');
  });
});

// --- getImplicitMarkers ---

describe('getImplicitMarkers', () => {
  test('extracts unique sorted values', () => {
    const bonds: Bond[] = [
      { from: 3, to: 7, label: '4' },
      { from: 7, to: 10, label: '3' },
    ];
    expect(getImplicitMarkers(bonds)).toEqual([3, 7, 10]);
  });

  test('empty bonds', () => {
    expect(getImplicitMarkers([])).toEqual([]);
  });
});

// --- filterBondsOnRangeChange ---

describe('filterBondsOnRangeChange', () => {
  test('keeps bonds within range', () => {
    const bonds: Bond[] = [
      { from: 2, to: 5, label: '3' },
      { from: 8, to: 15, label: '7' },
    ];
    expect(filterBondsOnRangeChange(bonds, 0, 10)).toEqual([
      { from: 2, to: 5, label: '3' },
    ]);
  });

  test('removes partially out of range', () => {
    const bonds: Bond[] = [
      { from: 3, to: 12, label: '9' }, // to > max
    ];
    expect(filterBondsOnRangeChange(bonds, 0, 10)).toEqual([]);
  });

  test('empty bonds', () => {
    expect(filterBondsOnRangeChange([], 0, 10)).toEqual([]);
  });
});

// --- snapBondsToStep ---

describe('snapBondsToStep', () => {
  test('bond that collapses to same point is removed', () => {
    const bonds: Bond[] = [
      { from: 3, to: 7, label: '4' },
    ];
    // Both 3 and 7 snap to 5 with step=5 → from===to → removed
    const result = snapBondsToStep(bonds, 5, 0, 20, 'essentiel');
    expect(result).toEqual([]);
  });

  test('bonds that collapse are removed', () => {
    const bonds: Bond[] = [
      { from: 1, to: 2, label: '1' },
    ];
    const result = snapBondsToStep(bonds, 5, 0, 20, 'essentiel');
    expect(result).toEqual([]); // both snap to 0
  });

  test('valid bond after resnap', () => {
    const bonds: Bond[] = [
      { from: 0, to: 10, label: '10' },
    ];
    const result = snapBondsToStep(bonds, 5, 0, 20, 'complet');
    expect(result).toEqual([{ from: 0, to: 10, label: '+10' }]);
  });
});

// --- isUnitaryChain ---

describe('isUnitaryChain', () => {
  test('3 unitary bonds → true', () => {
    const bonds: Bond[] = [
      { from: 0, to: 1, label: '1' },
      { from: 1, to: 2, label: '1' },
      { from: 2, to: 3, label: '1' },
    ];
    expect(isUnitaryChain(bonds, 1)).toBe(true);
  });

  test('2 unitary bonds → false (need 3)', () => {
    const bonds: Bond[] = [
      { from: 0, to: 1, label: '1' },
      { from: 1, to: 2, label: '1' },
    ];
    expect(isUnitaryChain(bonds, 1)).toBe(false);
  });

  test('mixed sizes → false', () => {
    const bonds: Bond[] = [
      { from: 0, to: 1, label: '1' },
      { from: 1, to: 3, label: '2' },
      { from: 3, to: 4, label: '1' },
    ];
    expect(isUnitaryChain(bonds, 1)).toBe(false);
  });

  test('3 negative unitary bonds → true', () => {
    const bonds: Bond[] = [
      { from: 5, to: 4, label: '1' },
      { from: 4, to: 3, label: '1' },
      { from: 3, to: 2, label: '1' },
    ];
    expect(isUnitaryChain(bonds, 1)).toBe(true);
  });

  test('step=2 with size=2 bonds → true', () => {
    const bonds: Bond[] = [
      { from: 0, to: 2, label: '2' },
      { from: 2, to: 4, label: '2' },
      { from: 4, to: 6, label: '2' },
    ];
    expect(isUnitaryChain(bonds, 2)).toBe(true);
  });
});

// --- isMarkerCoveredByPositiveBond ---

describe('isMarkerCoveredByPositiveBond', () => {
  test('marker within positive bond range', () => {
    const bonds: Bond[] = [{ from: 3, to: 7, label: '4' }];
    expect(isMarkerCoveredByPositiveBond(5, bonds)).toBe(true);
  });

  test('marker at bond endpoint', () => {
    const bonds: Bond[] = [{ from: 3, to: 7, label: '4' }];
    expect(isMarkerCoveredByPositiveBond(3, bonds)).toBe(true);
    expect(isMarkerCoveredByPositiveBond(7, bonds)).toBe(true);
  });

  test('marker outside positive bond range', () => {
    const bonds: Bond[] = [{ from: 3, to: 7, label: '4' }];
    expect(isMarkerCoveredByPositiveBond(1, bonds)).toBe(false);
    expect(isMarkerCoveredByPositiveBond(9, bonds)).toBe(false);
  });

  test('negative bond does not cover markers above', () => {
    const bonds: Bond[] = [{ from: 7, to: 3, label: '4' }]; // negative
    expect(isMarkerCoveredByPositiveBond(5, bonds)).toBe(false);
  });

  test('no bonds', () => {
    expect(isMarkerCoveredByPositiveBond(5, [])).toBe(false);
  });
});
