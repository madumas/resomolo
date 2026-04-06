import { describe, it, expect } from 'vitest';
import { computeTreeLayout, canBranchSame } from '../arbre-layout';
import type { ArbreLevel } from '../../model/types';

function levels(...specs: number[]): ArbreLevel[] {
  return specs.map((n, i) => ({
    name: `Niveau ${i + 1}`,
    options: Array.from({ length: n }, (_, j) => String.fromCharCode(65 + j)), // A, B, C...
  }));
}

describe('computeTreeLayout', () => {
  it('returns empty layout for no levels', () => {
    const r = computeTreeLayout([]);
    expect(r.nodes).toHaveLength(0);
    expect(r.branches).toHaveLength(0);
    expect(r.leafCount).toBe(0);
    expect(r.width).toBe(0);
    expect(r.height).toBe(0);
    expect(r.warning).toBeNull();
    expect(r.capped).toBe(false);
  });

  it('handles single level with 3 options', () => {
    const r = computeTreeLayout(levels(3));
    expect(r.nodes).toHaveLength(3);
    expect(r.branches).toHaveLength(0); // no parents → no branches
    expect(r.leafCount).toBe(3);
    expect(r.height).toBe(16); // 1 level, nodeH=16
  });

  it('2×2 = 2 nodes at L0, 4 at L1, 6 total, 4 branches', () => {
    const r = computeTreeLayout(levels(2, 2));
    expect(r.nodes).toHaveLength(2 + 4);
    expect(r.branches).toHaveLength(4); // each L0 node → 2 children
    expect(r.leafCount).toBe(4);
  });

  it('2×3 = 2 + 6 nodes, 6 branches, 6 leaves', () => {
    const r = computeTreeLayout(levels(2, 3));
    expect(r.nodes).toHaveLength(2 + 6);
    expect(r.branches).toHaveLength(6);
    expect(r.leafCount).toBe(6);
  });

  it('3×2 = 3 + 6 nodes, 6 branches, 6 leaves', () => {
    const r = computeTreeLayout(levels(3, 2));
    expect(r.nodes).toHaveLength(3 + 6);
    expect(r.branches).toHaveLength(6);
    expect(r.leafCount).toBe(6);
  });

  it('3×3 = 3 + 9 nodes, 9 branches, 9 leaves', () => {
    const r = computeTreeLayout(levels(3, 3));
    expect(r.nodes).toHaveLength(3 + 9);
    expect(r.branches).toHaveLength(9);
    expect(r.leafCount).toBe(9);
  });

  it('4×2 = 4 levels, 2 options each = 2+4+8+16 nodes, 16 leaves', () => {
    const r = computeTreeLayout(levels(2, 2, 2, 2));
    expect(r.leafCount).toBe(16);
    expect(r.nodes).toHaveLength(2 + 4 + 8 + 16);
    expect(r.warning).toBe('Ton arbre a 16 feuilles. C\'est beaucoup!');
    expect(r.capped).toBe(false);
  });

  it('warns at 16+ leaves', () => {
    const r = computeTreeLayout(levels(4, 4)); // 16 leaves
    expect(r.leafCount).toBe(16);
    expect(r.warning).not.toBeNull();
  });

  it('caps at 24 leaves', () => {
    const r = computeTreeLayout(levels(3, 3, 3)); // 27 > 24
    expect(r.leafCount).toBe(24);
    expect(r.capped).toBe(true);
    expect(r.warning).not.toBeNull();
  });

  it('no warning below 16 leaves', () => {
    const r = computeTreeLayout(levels(3, 5)); // 15 leaves
    expect(r.leafCount).toBe(15);
    expect(r.warning).toBeNull();
  });

  it('handles level with 0 options (treated as 1)', () => {
    const lvl: ArbreLevel[] = [
      { name: 'A', options: [] },
      { name: 'B', options: ['X', 'Y'] },
    ];
    const r = computeTreeLayout(lvl);
    // Empty options → treated as ['?'] → 1 * 2 = 2 leaves
    expect(r.leafCount).toBe(2);
    expect(r.nodes.some(n => n.label === '?')).toBe(true);
  });

  it('width > 0 for any non-empty tree', () => {
    const r = computeTreeLayout(levels(1));
    expect(r.width).toBeGreaterThan(0);
  });

  it('height increases with more levels', () => {
    const h2 = computeTreeLayout(levels(2, 2)).height;
    const h3 = computeTreeLayout(levels(2, 2, 2)).height;
    expect(h3).toBeGreaterThan(h2);
  });

  it('nodes at deeper levels have higher y', () => {
    const r = computeTreeLayout(levels(2, 2));
    const l0y = r.nodes.filter(n => n.levelIndex === 0)[0].y;
    const l1y = r.nodes.filter(n => n.levelIndex === 1)[0].y;
    expect(l1y).toBeGreaterThan(l0y);
  });

  it('branches connect parent bottom to child top', () => {
    const r = computeTreeLayout(levels(2, 2));
    for (const b of r.branches) {
      expect(b.y1).toBeLessThan(b.y2); // parent above child
    }
  });

  it('respects custom sibling gap', () => {
    const narrow = computeTreeLayout(levels(3, 3), 4);
    const wide = computeTreeLayout(levels(3, 3), 16);
    expect(wide.width).toBeGreaterThan(narrow.width);
  });
});

describe('canBranchSame', () => {
  it('returns false for shared-options model (current data model)', () => {
    const lvl = levels(2, 3);
    expect(canBranchSame(lvl, 1)).toBe(false);
  });

  it('returns false for out-of-bounds index', () => {
    expect(canBranchSame(levels(2), 0)).toBe(false);
    expect(canBranchSame(levels(2), 5)).toBe(false);
  });
});
