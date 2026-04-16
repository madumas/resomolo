// @vitest-environment jsdom

import { describe, test, expect } from 'vitest';
import { generateShareUrl, parseShareParam } from '../share';
import type { Piece } from '../../model/types';

function roundTrip(pieces: Piece[], text = 'Problème test') {
  const url = generateShareUrl(text, pieces);
  const qIndex = url.indexOf('?');
  const search = qIndex >= 0 ? url.slice(qIndex) : '';
  const parsed = parseShareParam(search);
  expect(parsed).not.toBeNull();
  return parsed!.pieces;
}

describe('share — round-trip fidelity', () => {
  test('droiteNumerique : bonds et markers préservés', () => {
    const piece = {
      id: 'dn-original',
      type: 'droiteNumerique',
      x: 20, y: 50, locked: false,
      min: 0, max: 20, step: 1,
      markers: [3, 7, 12],
      bonds: [
        { from: 3, to: 7, label: '+4' },
        { from: 7, to: 12, label: '+5' },
      ],
      width: 240,
    } as unknown as Piece;

    const [restored] = roundTrip([piece]);
    expect((restored as any).markers).toEqual([3, 7, 12]);
    expect((restored as any).bonds).toHaveLength(2);
    expect((restored as any).bonds[0].label).toBe('+4');
    expect((restored as any).bonds[1].from).toBe(7);
  });

  test('jeton → boite : parentId remappé', () => {
    const boite = {
      id: 'b-boite',
      type: 'boite',
      x: 0, y: 0, locked: false,
      width: 60, height: 40, label: 'Groupe', value: '3', couleur: 'bleu',
    } as unknown as Piece;
    const jeton = {
      id: 'j-child',
      type: 'jeton',
      x: 10, y: 10, locked: false,
      couleur: 'bleu',
      parentId: 'b-boite',
    } as unknown as Piece;

    const restored = roundTrip([boite, jeton]);
    const [rBoite, rJeton] = restored;
    expect(rBoite.id).not.toBe('b-boite');
    expect((rJeton as any).parentId).toBe(rBoite.id);
    expect((rJeton as any).parentId).not.toBe('b-boite');
  });

  test('fleche : fromId et toId remappés', () => {
    const a = { id: 'A', type: 'jeton', x: 0, y: 0, locked: false, couleur: 'bleu', parentId: null } as unknown as Piece;
    const b = { id: 'B', type: 'jeton', x: 20, y: 0, locked: false, couleur: 'bleu', parentId: null } as unknown as Piece;
    const fleche = {
      id: 'F', type: 'fleche', x: 0, y: 0, locked: false,
      fromId: 'A', toId: 'B', label: 'lien',
    } as unknown as Piece;

    const [rA, rB, rF] = roundTrip([a, b, fleche]);
    expect((rF as any).fromId).toBe(rA.id);
    expect((rF as any).toId).toBe(rB.id);
    expect((rF as any).fromId).not.toBe('A');
  });

  test('etiquette : attachedTo remappé', () => {
    const barre = {
      id: 'bar', type: 'barre', x: 0, y: 0, locked: false,
      couleur: 'bleu', sizeMultiplier: 1, label: '', value: '',
      divisions: null, coloredParts: [], showFraction: false,
      groupId: null, groupLabel: null,
    } as unknown as Piece;
    const et = {
      id: 'e1', type: 'etiquette', x: 0, y: 10, locked: false,
      text: 'pommes', attachedTo: 'bar',
    } as unknown as Piece;

    const [rBar, rEt] = roundTrip([barre, et]);
    expect((rEt as any).attachedTo).toBe(rBar.id);
  });

  test('scénario composite : bar model + étiquette + droite + flèche', () => {
    const barre = {
      id: 'barre1', type: 'barre', x: 10, y: 10, locked: false,
      couleur: 'bleu', sizeMultiplier: 2, label: 'Total', value: '12',
      divisions: null, coloredParts: [], showFraction: false,
      groupId: null, groupLabel: null,
    } as unknown as Piece;
    const etiquette = {
      id: 'lbl1', type: 'etiquette', x: 10, y: 30, locked: false,
      text: 'pommes', attachedTo: 'barre1',
    } as unknown as Piece;
    const droite = {
      id: 'dn1', type: 'droiteNumerique', x: 10, y: 60, locked: false,
      min: 0, max: 12, step: 1, markers: [4, 8],
      bonds: [{ from: 0, to: 4, label: '+4' }, { from: 4, to: 8, label: '+4' }],
      width: 200,
    } as unknown as Piece;
    const fleche = {
      id: 'fleche1', type: 'fleche', x: 0, y: 0, locked: false,
      fromId: 'barre1', toId: 'dn1', label: '',
    } as unknown as Piece;

    const restored = roundTrip([barre, etiquette, droite, fleche]);
    const [rBarre, rEtiquette, rDroite, rFleche] = restored;

    // Relations préservées
    expect((rEtiquette as any).attachedTo).toBe(rBarre.id);
    expect((rFleche as any).fromId).toBe(rBarre.id);
    expect((rFleche as any).toId).toBe(rDroite.id);

    // Contenu de la droite préservé
    expect((rDroite as any).bonds).toHaveLength(2);
    expect((rDroite as any).markers).toEqual([4, 8]);

    // Label/valeur barre préservés
    expect((rBarre as any).label).toBe('Total');
    expect((rBarre as any).value).toBe('12');
    expect((rBarre as any).sizeMultiplier).toBe(2);
  });

  test('parentId orphelin : remap à null (pas de collision)', () => {
    // Un jeton qui référence un parent absent du payload — remap → null
    const orphan = {
      id: 'orph', type: 'jeton', x: 0, y: 0, locked: false,
      couleur: 'bleu', parentId: 'boite-inconnue',
    } as unknown as Piece;

    const [restored] = roundTrip([orphan]);
    expect((restored as any).parentId).toBeNull();
  });
});
