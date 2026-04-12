import { describe, test, expect } from 'vitest';
import { WORKED_EXAMPLES } from '../worked-examples';
import { PROBLEM_PRESETS } from '../problems';

describe('Worked examples', () => {
  test('no duplicate IDs', () => {
    const ids = WORKED_EXAMPLES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('all pieces are locked', () => {
    WORKED_EXAMPLES.forEach(ex => {
      ex.state.pieces.forEach(p => {
        expect(p.locked).toBe(true);
      });
    });
  });

  test('all pairedProblemIds reference existing problems', () => {
    const validIds = new Set(PROBLEM_PRESETS.map(p => p.id));
    WORKED_EXAMPLES.forEach(ex => {
      ex.pairedProblemIds.forEach(id => {
        expect(validIds.has(id)).toBe(true);
      });
    });
  });

  test('each example has at least 1 paired problem', () => {
    WORKED_EXAMPLES.forEach(ex => {
      expect(ex.pairedProblemIds.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('all explanations are non-empty', () => {
    WORKED_EXAMPLES.forEach(ex => {
      expect(ex.explanation.length).toBeGreaterThan(0);
    });
  });

  test('has at least 10 examples (complete category coverage)', () => {
    expect(WORKED_EXAMPLES.length).toBeGreaterThanOrEqual(10);
  });

  test('covers all 5 category groups', () => {
    const groups = new Set(WORKED_EXAMPLES.map(e => e.categoryGroup));
    expect(groups).toContain('additif');
    expect(groups).toContain('multiplicatif');
    expect(groups).toContain('fractions');
    expect(groups).toContain('stats-proba');
    expect(groups).toContain('complexe');
  });
});
