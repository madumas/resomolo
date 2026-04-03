import { describe, test, expect } from 'vitest';
import { PROBLEM_PRESETS } from '../problems';

describe('Problem presets', () => {
  test('has at least 15 problems', () => {
    expect(PROBLEM_PRESETS.length).toBeGreaterThanOrEqual(15);
  });

  test('no duplicate IDs', () => {
    const ids = PROBLEM_PRESETS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('all have valid cycle (2 or 3)', () => {
    PROBLEM_PRESETS.forEach(p => {
      expect([2, 3]).toContain(p.cycle);
    });
  });

  test('all have valid difficulty (1, 2, or 3)', () => {
    PROBLEM_PRESETS.forEach(p => {
      expect([1, 2, 3]).toContain(p.difficulty);
    });
  });

  test('all have valid category', () => {
    const validCategories = [
      'addition',
      'soustraction',
      'multiplication',
      'division',
      'multi-etapes',
      'comparaison',
      'partage',
      'fraction',
      'statistique',
      'probabilite',
    ];
    PROBLEM_PRESETS.forEach(p => {
      expect(validCategories).toContain(p.category);
    });
  });

  test('has at least 5 cycle 2 problems', () => {
    const cycle2 = PROBLEM_PRESETS.filter(p => p.cycle === 2);
    expect(cycle2.length).toBeGreaterThanOrEqual(5);
  });

  test('has at least 5 cycle 3 problems', () => {
    const cycle3 = PROBLEM_PRESETS.filter(p => p.cycle === 3);
    expect(cycle3.length).toBeGreaterThanOrEqual(5);
  });

  test('all have non-empty text', () => {
    PROBLEM_PRESETS.forEach(p => {
      expect(p.text.length).toBeGreaterThan(0);
    });
  });

  test('all have non-empty title', () => {
    PROBLEM_PRESETS.forEach(p => {
      expect(p.title.length).toBeGreaterThan(0);
    });
  });

  test('all have required fields', () => {
    PROBLEM_PRESETS.forEach(p => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('title');
      expect(p).toHaveProperty('text');
      expect(p).toHaveProperty('cycle');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('difficulty');
    });
  });
});
