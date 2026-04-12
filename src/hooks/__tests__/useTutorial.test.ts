import { describe, test, expect } from 'vitest';
import { STEP_MESSAGES, STEP_DETECTORS } from '../useTutorial';
import type { ModelisationState } from '../../model/types';

function emptyState(): ModelisationState {
  return {
    probleme: '',
    problemeReadOnly: false,
    problemeHighlights: [],
    referenceUnitMm: 60,
    pieces: [],
    availablePieces: null,
  };
}

function makePiece(type: string, extra: Record<string, unknown> = {}) {
  return { id: `test-${type}`, type, x: 0, y: 0, locked: false, ...extra } as ModelisationState['pieces'][number];
}

describe('Tutorial step messages — estompage progressif', () => {
  test('problem1_highlight does not contain "en bleu"', () => {
    expect(STEP_MESSAGES.problem1_highlight).not.toContain('en bleu');
  });

  test('problem2_place_bar does not contain "Copier" or "2 copies"', () => {
    expect(STEP_MESSAGES.problem2_place_bar).not.toContain('Copier');
    expect(STEP_MESSAGES.problem2_place_bar).not.toContain('2 copies');
  });

  test('problem1_place_tokens is directive — mentions Jeton', () => {
    expect(STEP_MESSAGES.problem1_place_tokens).toContain('Jeton');
  });

  test('problem2_intro is directive — mentions Barre', () => {
    expect(STEP_MESSAGES.problem2_intro).toContain('Barre');
  });
});

describe('Tutorial detectors', () => {
  test('problem1_place_tokens detects jeton (happy path)', () => {
    const s = emptyState();
    s.pieces = [makePiece('jeton', { couleur: 'bleu', parentId: null })];
    expect(STEP_DETECTORS.problem1_place_tokens!(s)).toBe(true);
  });

  test('problem2_intro detects barre (happy path)', () => {
    const s = emptyState();
    s.pieces = [makePiece('barre', { couleur: 'bleu', sizeMultiplier: 1, label: '', value: '', divisions: null, coloredParts: [], showFraction: false, groupId: null })];
    expect(STEP_DETECTORS.problem2_intro!(s)).toBe(true);
  });

  test('problem2_place_bar triggers with 3 barres (happy path)', () => {
    const s = emptyState();
    s.pieces = [
      makePiece('barre', { id: 'b1', couleur: 'bleu', sizeMultiplier: 1, label: '', value: '', divisions: null, coloredParts: [], showFraction: false, groupId: null }),
      makePiece('barre', { id: 'b2', couleur: 'bleu', sizeMultiplier: 1, label: '', value: '', divisions: null, coloredParts: [], showFraction: false, groupId: null }),
      makePiece('barre', { id: 'b3', couleur: 'bleu', sizeMultiplier: 1, label: '', value: '', divisions: null, coloredParts: [], showFraction: false, groupId: null }),
    ];
    expect(STEP_DETECTORS.problem2_place_bar!(s)).toBe(true);
  });

  test('problem2_place_bar triggers with 3 jetons (widened detector)', () => {
    const s = emptyState();
    s.pieces = [
      makePiece('jeton', { id: 'j1', couleur: 'bleu', parentId: null }),
      makePiece('jeton', { id: 'j2', couleur: 'bleu', parentId: null }),
      makePiece('jeton', { id: 'j3', couleur: 'bleu', parentId: null }),
    ];
    expect(STEP_DETECTORS.problem2_place_bar!(s)).toBe(true);
  });

  test('problem2_place_bar does not trigger with calcul/reponse pieces', () => {
    const s = emptyState();
    s.pieces = [
      makePiece('calcul', { id: 'c1', expression: '3 x 4' }),
      makePiece('reponse', { id: 'r1', text: '12', template: null }),
      makePiece('barre', { id: 'b1', couleur: 'bleu', sizeMultiplier: 1, label: '', value: '', divisions: null, coloredParts: [], showFraction: false, groupId: null }),
    ];
    expect(STEP_DETECTORS.problem2_place_bar!(s)).toBe(false);
  });

  test('problem1_highlight detects any highlight', () => {
    const s = emptyState();
    s.problemeHighlights = [{ start: 0, end: 5, color: 'bleu' }];
    expect(STEP_DETECTORS.problem1_highlight!(s)).toBe(true);
  });
});
