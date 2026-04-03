import { describe, it, expect } from 'vitest';
import { snapBarAlignment } from '../snap';
import type { Barre } from '../../model/types';

function makeBarre(overrides: Partial<Barre> = {}): Barre {
  return {
    id: 'b1',
    type: 'barre',
    x: 100,
    y: 100,
    locked: false,
    couleur: 'bleu',
    sizeMultiplier: 1,
    label: '',
    value: '',
    divisions: null,
    coloredParts: [],
    showFraction: false,
    groupId: null,
    groupLabel: null,
    ...overrides,
  };
}

const SNAP_RADIUS = 15; // barAlignSnapMm

describe('snapBarAlignment', () => {
  it('no other bars -- returns unchanged position', () => {
    const pos = { x: 50, y: 50 };
    const result = snapBarAlignment(pos, 'b1', [], SNAP_RADIUS);
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it('bar within snap radius -- x snaps to match', () => {
    // BAR_HEIGHT_MM = 15, snap radius = 15
    // verticalDist must be < barAlignSnapMm + BAR_HEIGHT_MM = 30
    // and |x - bar.x| must be < barAlignSnapMm = 15
    const existingBar = makeBarre({ id: 'b2', x: 100, y: 100 });
    const pos = { x: 110, y: 120 }; // verticalDist=20 < 30, xDist=10 < 15
    const result = snapBarAlignment(pos, 'b1', [existingBar], SNAP_RADIUS);
    expect(result.x).toBe(100); // snapped to bar.x
    expect(result.y).toBe(120); // y unchanged
  });

  it('bar outside snap radius -- no snap', () => {
    const existingBar = makeBarre({ id: 'b2', x: 100, y: 100 });
    // x distance = 50, well beyond snap radius of 15
    const pos = { x: 150, y: 115 };
    const result = snapBarAlignment(pos, 'b1', [existingBar], SNAP_RADIUS);
    expect(result.x).toBe(150); // no snap
    expect(result.y).toBe(115);
  });

  it('multiple bars -- snaps to the last eligible bar (iteration overwrites)', () => {
    const bar1 = makeBarre({ id: 'b2', x: 100, y: 100 });
    const bar2 = makeBarre({ id: 'b3', x: 108, y: 100 });
    // pos is within snap distance of both bars; the loop doesn't break,
    // so x snaps to bar1 (100), then bar2 checks |100-108|=8 < 15, overwrites to 108
    const pos = { x: 112, y: 120 };
    const result = snapBarAlignment(pos, 'b1', [bar1, bar2], SNAP_RADIUS);
    expect(result.x).toBe(108);
  });

  it('same piece id is excluded from snap candidates', () => {
    // isBarre(p) && p.id !== pieceId filters out pieces with same id
    const selfBar = makeBarre({ id: 'b1', x: 100, y: 100 });
    const pos = { x: 110, y: 115 };
    const result = snapBarAlignment(pos, 'b1', [selfBar], SNAP_RADIUS);
    expect(result.x).toBe(110); // no snap, self excluded
    expect(result.y).toBe(115);
  });

  it('vertically far bar does not snap', () => {
    // verticalDist = 50, which is > barAlignSnapMm + BAR_HEIGHT_MM = 30
    const existingBar = makeBarre({ id: 'b2', x: 100, y: 100 });
    const pos = { x: 110, y: 200 };
    const result = snapBarAlignment(pos, 'b1', [existingBar], SNAP_RADIUS);
    expect(result.x).toBe(110); // no snap
  });
});
