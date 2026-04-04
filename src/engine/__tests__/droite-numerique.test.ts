import { describe, test, expect } from 'vitest';

/**
 * Tests for the DroiteNumerique tick computation logic.
 * These mirror the calculations in DroiteNumeriquePiece.tsx.
 */

function computeTicks(min: number, max: number, step: number) {
  const safeStep = Math.max(0.1, step);
  const numTicks = Math.floor((max - min) / safeStep) + 1;
  const labelEvery = numTicks > 50 ? 10 : numTicks > 20 ? 5 : 1;

  return Array.from({ length: numTicks }, (_, i) => {
    const val = min + i * safeStep;
    const isZero = min < 0 && Math.abs(val) < 1e-9;
    const isLabeled = i % labelEvery === 0 || isZero;
    return { val, isZero, isLabeled };
  });
}

describe('DroiteNumerique tick computation', () => {
  test('basic 0-10 line has 11 ticks, no zero distinction', () => {
    const ticks = computeTicks(0, 10, 1);
    expect(ticks).toHaveLength(11);
    expect(ticks[0].val).toBe(0);
    expect(ticks[0].isZero).toBe(false); // min=0, no distinction
    expect(ticks[10].val).toBe(10);
  });

  test('negative range -10 to 10 has zero tick distinguished', () => {
    const ticks = computeTicks(-10, 10, 1);
    expect(ticks).toHaveLength(21);
    const zeroTick = ticks.find(t => t.isZero);
    expect(zeroTick).toBeDefined();
    expect(zeroTick!.val).toBe(0);
    expect(zeroTick!.isLabeled).toBe(true);
  });

  test('negative range -15 to 10 step 5 has zero tick', () => {
    const ticks = computeTicks(-15, 10, 5);
    expect(ticks).toHaveLength(6); // -15, -10, -5, 0, 5, 10
    const zeroTick = ticks.find(t => t.isZero);
    expect(zeroTick).toBeDefined();
    expect(zeroTick!.isLabeled).toBe(true);
  });

  test('negative range where zero is not on step boundary has no zero tick', () => {
    const ticks = computeTicks(-3, 10, 2);
    // Ticks: -3, -1, 1, 3, 5, 7, 9
    expect(ticks.every(t => !t.isZero)).toBe(true);
  });

  test('positive range 5-20 has no zero distinction', () => {
    const ticks = computeTicks(5, 20, 1);
    expect(ticks.every(t => !t.isZero)).toBe(true);
  });

  test('large range uses labelEvery to reduce labels', () => {
    const ticks = computeTicks(-50, 50, 1);
    expect(ticks).toHaveLength(101);
    // labelEvery = 10 (numTicks > 50)
    const labeled = ticks.filter(t => t.isLabeled);
    // 11 regular labels (every 10th) + zero is always labeled
    // Zero is at index 50 which is 50 % 10 === 0, so it's already in the regular cadence
    expect(labeled.length).toBe(11);
    expect(labeled.find(t => t.isZero)).toBeDefined();
  });

  test('zero is labeled even outside labelEvery cadence', () => {
    // -20 to 20, step 1 → 41 ticks, labelEvery = 5
    const ticks = computeTicks(-20, 20, 1);
    expect(ticks).toHaveLength(41);
    const zeroTick = ticks.find(t => t.isZero);
    expect(zeroTick).toBeDefined();
    expect(zeroTick!.isLabeled).toBe(true);
    // Zero is at index 20, 20 % 5 === 0, so it's in cadence here too.
    // Test with offset: -22 to 20, step 1 → 43 ticks, labelEvery = 5
    const ticks2 = computeTicks(-22, 20, 1);
    const zeroTick2 = ticks2.find(t => t.isZero);
    expect(zeroTick2).toBeDefined();
    expect(zeroTick2!.isLabeled).toBe(true);
    // Zero is at index 22, 22 % 5 === 2, so NOT in regular cadence — but isZero forces label
  });

  test('temperature range -15 to 40 step 5', () => {
    const ticks = computeTicks(-15, 40, 5);
    // -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40 = 12 ticks
    expect(ticks).toHaveLength(12);
    const zeroTick = ticks.find(t => t.isZero);
    expect(zeroTick).toBeDefined();
    const negatives = ticks.filter(t => t.val < 0);
    expect(negatives).toHaveLength(3);
  });

  test('step=0 is guarded to 0.1', () => {
    const ticks = computeTicks(0, 1, 0);
    // safeStep = 0.1, so 11 ticks: 0, 0.1, 0.2, ..., 1.0
    expect(ticks).toHaveLength(11);
  });
});
