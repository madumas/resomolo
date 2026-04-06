import { describe, it, expect } from 'vitest';
import { computeAutoScale, niceNumber, getPlotArea, DEFAULT_CHART_DIMS } from '../chart-layout';

describe('niceNumber', () => {
  it('rounds up small values', () => {
    expect(niceNumber(3, true)).toBe(5);
    expect(niceNumber(7, true)).toBe(10);
    expect(niceNumber(1.5, true)).toBe(2);
  });

  it('rounds up larger values', () => {
    expect(niceNumber(12, true)).toBe(20);
    expect(niceNumber(45, true)).toBe(50);
    expect(niceNumber(80, true)).toBe(100);
  });

  it('handles zero and negative', () => {
    expect(niceNumber(0)).toBe(1);
    expect(niceNumber(-5)).toBe(1);
  });

  it('rounds to nearest (non-ceiling)', () => {
    expect(niceNumber(3, false)).toBe(2);
    expect(niceNumber(7, false)).toBe(5);
    expect(niceNumber(1.2, false)).toBe(1);
  });
});

describe('computeAutoScale', () => {
  it('returns default for empty array', () => {
    const axis = computeAutoScale([]);
    expect(axis.min).toBe(0);
    expect(axis.max).toBeGreaterThan(0);
    expect(axis.step).toBeGreaterThan(0);
  });

  it('returns default for all-zero values', () => {
    const axis = computeAutoScale([0, 0, 0]);
    expect(axis.min).toBe(0);
    expect(axis.max).toBeGreaterThan(0);
  });

  it('scales to nice numbers for typical values', () => {
    const axis = computeAutoScale([3, 5, 2]);
    expect(axis.min).toBe(0);
    expect(axis.max).toBeGreaterThanOrEqual(5);
    expect(axis.step).toBeGreaterThan(0);
    // Max should be a nice number
    expect(axis.max % axis.step).toBe(0);
  });

  it('handles large values', () => {
    const axis = computeAutoScale([100, 250, 180]);
    expect(axis.min).toBe(0);
    expect(axis.max).toBeGreaterThanOrEqual(250);
    expect(axis.step).toBeGreaterThanOrEqual(10);
  });

  it('step is always >= 1', () => {
    const axis = computeAutoScale([0.5]);
    expect(axis.step).toBeGreaterThanOrEqual(1);
  });
});

describe('getPlotArea', () => {
  it('computes plot area from default dims', () => {
    const plot = getPlotArea(DEFAULT_CHART_DIMS);
    expect(plot.x).toBe(15);
    expect(plot.y).toBe(6);
    expect(plot.width).toBe(120 - 15 - 4); // 101
    expect(plot.height).toBe(90 - 6 - 12); // 72
  });

  it('computes plot area from custom dims', () => {
    const plot = getPlotArea({ width: 200, height: 150, paddingLeft: 20, paddingBottom: 15, paddingTop: 10, paddingRight: 5 });
    expect(plot.x).toBe(20);
    expect(plot.y).toBe(10);
    expect(plot.width).toBe(175);
    expect(plot.height).toBe(125);
  });
});
