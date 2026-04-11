import { describe, test, expect } from 'vitest';
import { importModelisation } from '../persistence';

describe('importModelisation', () => {
  test('parses valid file', async () => {
    const data = {
      version: 1,
      probleme: 'Test problem',
      problemeReadOnly: true,
      problemeHighlights: [],
      referenceUnitMm: 60,
      pieces: [],
      availablePieces: null,
    };
    const file = new File([JSON.stringify(data)], 'test.resomolo', {
      type: 'application/json',
    });
    const result = await importModelisation(file);
    expect(result).not.toBeNull();
    expect(result!.probleme).toBe('Test problem');
    expect(result!.problemeReadOnly).toBe(true);
    expect(result!.problemeHighlights).toEqual([]);
    expect(result!.referenceUnitMm).toBe(60);
    expect(result!.pieces).toEqual([]);
    expect(result!.availablePieces).toBeNull();
  });

  test('returns null for invalid JSON', async () => {
    const file = new File(['not json'], 'bad.resomolo');
    const result = await importModelisation(file);
    expect(result).toBeNull();
  });

  test('returns null for missing pieces', async () => {
    const file = new File(
      [JSON.stringify({ version: 1 })],
      'no-pieces.resomolo',
    );
    const result = await importModelisation(file);
    expect(result).toBeNull();
  });

  test('returns null for missing version', async () => {
    const file = new File(
      [JSON.stringify({ pieces: [] })],
      'no-version.resomolo',
    );
    const result = await importModelisation(file);
    expect(result).toBeNull();
  });

  test('fills defaults for missing optional fields', async () => {
    const data = { version: 1, pieces: [] };
    const file = new File([JSON.stringify(data)], 'minimal.resomolo');
    const result = await importModelisation(file);
    expect(result).not.toBeNull();
    expect(result!.referenceUnitMm).toBe(60);
    expect(result!.probleme).toBe('');
    expect(result!.problemeReadOnly).toBe(false);
    expect(result!.problemeHighlights).toEqual([]);
    expect(result!.availablePieces).toBeNull();
  });

  test('preserves pieces from file', async () => {
    const fakePiece = {
      id: 'p1',
      type: 'jeton',
      x: 10,
      y: 20,
      locked: false,
      couleur: 'bleu',
      parentId: null,
    };
    const data = { version: 1, pieces: [fakePiece] };
    const file = new File([JSON.stringify(data)], 'with-piece.resomolo');
    const result = await importModelisation(file);
    expect(result).not.toBeNull();
    expect(result!.pieces).toHaveLength(1);
    expect(result!.pieces[0].id).toBe('p1');
  });

  test('migrates droiteNumerique without bonds field', async () => {
    const droite = {
      id: 'dn1',
      type: 'droiteNumerique',
      x: 50, y: 200,
      locked: false,
      min: 0, max: 10, step: 1,
      markers: [3, 7],
      width: 200,
      // no bonds field — should be migrated to []
    };
    const data = { version: 1, pieces: [droite] };
    const file = new File([JSON.stringify(data)], 'droite-old.resomolo');
    const result = await importModelisation(file);
    expect(result).not.toBeNull();
    expect((result!.pieces[0] as any).bonds).toEqual([]);
    expect((result!.pieces[0] as any).markers).toEqual([3, 7]);
  });

  test('preserves droiteNumerique with bonds field', async () => {
    const droite = {
      id: 'dn1',
      type: 'droiteNumerique',
      x: 50, y: 200,
      locked: false,
      min: 0, max: 10, step: 1,
      markers: [3, 7, 10],
      bonds: [{ from: 3, to: 7, label: '4' }, { from: 7, to: 10, label: '3' }],
      width: 200,
    };
    const data = { version: 1, pieces: [droite] };
    const file = new File([JSON.stringify(data)], 'droite-bonds.resomolo');
    const result = await importModelisation(file);
    expect(result).not.toBeNull();
    expect((result!.pieces[0] as any).bonds).toHaveLength(2);
    expect((result!.pieces[0] as any).bonds[0].label).toBe('4');
  });
});
