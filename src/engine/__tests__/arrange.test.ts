import { describe, it, expect } from 'vitest';
import { computeArrangement } from '../arrange';
import type { Barre, Jeton, Calcul, Reponse } from '../../model/types';

function makeBarre(id: string, x = 0, y = 0, locked = false): Barre {
  return { id, type: 'barre', x, y, locked, couleur: 'bleu', sizeMultiplier: 1, label: '', value: '', divisions: null, coloredParts: [], showFraction: false, groupId: null, groupLabel: null };
}
function makeJeton(id: string, x = 0, y = 0, locked = false): Jeton {
  return { id, type: 'jeton', x, y, locked, couleur: 'bleu', parentId: null };
}
function makeCalcul(id: string, x = 0, y = 0): Calcul {
  return { id, type: 'calcul', x, y, locked: false, expression: '5+3=8' };
}
function makeReponse(id: string, x = 0, y = 0): Reponse {
  return { id, type: 'reponse', x, y, locked: false, text: '8 pommes', template: null };
}

describe('computeArrangement', () => {
  it('returns empty array for empty pieces', () => {
    expect(computeArrangement([], 60)).toEqual([]);
  });

  it('returns empty array when all pieces are locked', () => {
    const pieces = [makeBarre('b1', 100, 100, true)];
    expect(computeArrangement(pieces, 60)).toEqual([]);
  });

  it('skips locked pieces', () => {
    const pieces = [
      makeBarre('b1', 100, 100, true),
      makeBarre('b2', 200, 200, false),
    ];
    const moves = computeArrangement(pieces, 60);
    expect(moves.some(m => m.id === 'b1')).toBe(false);
    expect(moves.some(m => m.id === 'b2')).toBe(true);
  });

  it('groups barres before jetons before calculs before reponse', () => {
    const pieces = [
      makeReponse('r1', 10, 10),
      makeCalcul('c1', 20, 20),
      makeJeton('j1', 30, 30),
      makeBarre('b1', 40, 40),
    ];
    const moves = computeArrangement(pieces, 60);

    const barreMove = moves.find(m => m.id === 'b1')!;
    const jetonMove = moves.find(m => m.id === 'j1')!;
    const calculMove = moves.find(m => m.id === 'c1')!;
    const reponseMove = moves.find(m => m.id === 'r1')!;

    // barres should be highest (smallest y)
    expect(barreMove.y).toBeLessThan(jetonMove.y);
    expect(jetonMove.y).toBeLessThan(calculMove.y);
    expect(calculMove.y).toBeLessThan(reponseMove.y);
  });

  it('maintains spacing between pieces', () => {
    const pieces = [
      makeBarre('b1', 300, 300),
      makeBarre('b2', 100, 100),
    ];
    const moves = computeArrangement(pieces, 60);
    expect(moves.length).toBe(2);

    // Both should have x = 15 (MARGIN)
    expect(moves[0].x).toBe(15);
    // Second barre should be right of first with H_GAP
    expect(moves[1].x).toBe(15 + 60 + 10); // MARGIN + barWidth(1*60) + H_GAP
  });
});
