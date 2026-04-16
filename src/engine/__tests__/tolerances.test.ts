import { describe, it, expect } from 'vitest';
import { getTolerances } from '../tolerances';
import { SNAP_GRID_MM, CLICK_DEBOUNCE_MS } from '../../model/types';

describe('getTolerances', () => {
  it('normal profile returns baseline values', () => {
    const t = getTolerances('normal');
    expect(t.barAlignSnapMm).toBe(15);
    // Changement intentionnel (QA 2.7) : 1.5 mm laissait passer le tremblement
    // postural TDC (≈ 1.5–3 mm). 2.5 mm filtre la majorité sans couper les gestes.
    expect(t.dragThresholdMm).toBe(2.5);
    expect(t.hitTestPaddingMm).toBe(0);
    expect(t.jetonHitPaddingMm).toBe(0);
    expect(t.snapGridMm).toBe(SNAP_GRID_MM);
    expect(t.clickDebounceMs).toBe(CLICK_DEBOUNCE_MS);
  });

  it('large profile scales spatial tolerances by 1.5', () => {
    const t = getTolerances('large');
    expect(t.barAlignSnapMm).toBe(22.5);
    expect(t.dragThresholdMm).toBe(3.75); // 2.5 × 1.5
    expect(t.hitTestPaddingMm).toBe(1.5);
  });

  it('tres-large profile scales spatial tolerances by 2.0', () => {
    const t = getTolerances('tres-large');
    expect(t.barAlignSnapMm).toBe(30);
    expect(t.dragThresholdMm).toBe(5.0); // 2.5 × 2.0
    expect(t.hitTestPaddingMm).toBe(3.0);
  });

  it('grid spacing does NOT scale', () => {
    expect(getTolerances('large').snapGridMm).toBe(SNAP_GRID_MM);
    expect(getTolerances('tres-large').snapGridMm).toBe(SNAP_GRID_MM);
  });

  it('click debounce scales with sqrt of multiplier for accessibility', () => {
    expect(getTolerances('normal').clickDebounceMs).toBe(CLICK_DEBOUNCE_MS);
    expect(getTolerances('large').clickDebounceMs).toBeGreaterThan(CLICK_DEBOUNCE_MS);
    expect(getTolerances('tres-large').clickDebounceMs).toBeGreaterThan(getTolerances('large').clickDebounceMs);
  });

  it('jeton hit padding is 0 at all profiles (hit radius 7mm already exceeds spacing/2)', () => {
    for (const profile of ['normal', 'large', 'tres-large'] as const) {
      const t = getTolerances(profile);
      // With hit radius 7mm and spacing 10mm, no padding can be added without overlap
      expect(t.jetonHitPaddingMm).toBe(0);
    }
  });

  it('non-jeton padding at tres-large is generous (3mm)', () => {
    const t = getTolerances('tres-large');
    expect(t.hitTestPaddingMm).toBe(3.0);
    // But jeton padding is capped lower
    expect(t.jetonHitPaddingMm).toBeLessThan(t.hitTestPaddingMm);
  });
});
