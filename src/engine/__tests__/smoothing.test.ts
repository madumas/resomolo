import { describe, it, expect } from 'vitest';
import { createSmoothingState, smooth } from '../smoothing';

describe('cursor smoothing', () => {
  it('first sample passes through unchanged', () => {
    const state = createSmoothingState();
    const result = smooth(state, 100, 200);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
    expect(result.state.initialized).toBe(true);
  });

  it('subsequent samples are smoothed towards raw position', () => {
    let state = createSmoothingState();
    // First point
    const r1 = smooth(state, 0, 0);
    state = r1.state;
    // Jump to (100, 100)
    const r2 = smooth(state, 100, 100);
    // Should be between 0 and 100 (EMA with alpha=0.3 → 30)
    expect(r2.x).toBeCloseTo(30, 1);
    expect(r2.y).toBeCloseTo(30, 1);
  });

  it('converges to target with repeated samples', () => {
    let state = createSmoothingState();
    const r1 = smooth(state, 0, 0);
    state = r1.state;
    // Repeatedly sample at (100, 100)
    for (let i = 0; i < 20; i++) {
      const r = smooth(state, 100, 100);
      state = r.state;
    }
    // After many samples, should be very close to 100
    const final = smooth(state, 100, 100);
    expect(final.x).toBeCloseTo(100, 0);
    expect(final.y).toBeCloseTo(100, 0);
  });

  it('smoothed position is always between previous and raw', () => {
    let state = createSmoothingState();
    const r1 = smooth(state, 50, 50);
    state = r1.state;

    const raw = { x: 150, y: 150 };
    const result = smooth(state, raw.x, raw.y);

    expect(result.x).toBeGreaterThan(50);
    expect(result.x).toBeLessThan(150);
    expect(result.y).toBeGreaterThan(50);
    expect(result.y).toBeLessThan(150);
  });
});
