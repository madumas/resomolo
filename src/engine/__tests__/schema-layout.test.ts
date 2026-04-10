import { describe, it, expect } from 'vitest';
import { computeSchemaWidth, computeSchemaHeight, getGabaritDefaults, computePartLayout } from '../schema-layout';
import type { Schema } from '../../model/types';

const REF = 60; // referenceUnitMm

function makeSchema(overrides: Partial<Schema> = {}): Schema {
  return {
    id: 'test', type: 'schema', x: 0, y: 0, locked: false,
    gabarit: 'libre',
    totalLabel: '',
    totalValue: null,
    bars: [{ label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] }],
    referenceWidth: REF,
    ...overrides,
  };
}

describe('getGabaritDefaults', () => {
  it('parties-tout returns undivided bar (0 parts) — R3', () => {
    const d = getGabaritDefaults('parties-tout', REF);
    expect(d.gabarit).toBe('parties-tout');
    expect(d.bars).toHaveLength(1);
    expect(d.bars![0].parts).toHaveLength(0); // R3: undivided
  });

  it('comparaison returns 2 bars of different sizes', () => {
    const d = getGabaritDefaults('comparaison', REF);
    expect(d.bars).toHaveLength(2);
    expect(d.bars![0].sizeMultiplier).toBeGreaterThan(d.bars![1].sizeMultiplier);
    expect(d.bars![0].couleur).not.toBe(d.bars![1].couleur);
  });

  it('groupes-egaux returns 1 bar (child adds more) — R3', () => {
    const d = getGabaritDefaults('groupes-egaux', REF);
    expect(d.bars).toHaveLength(1); // R3: not 3 pre-structured
  });

  it('transformation returns bar with 2 parts (départ + changement) — R6', () => {
    const d = getGabaritDefaults('transformation', REF);
    expect(d.gabarit).toBe('transformation');
    expect(d.bars).toHaveLength(1);
    expect(d.bars![0].parts).toHaveLength(2);
    expect(d.bars![0].parts[0].label).toBe('départ');
    expect(d.bars![0].parts[1].label).toBe('changement');
    expect(d.totalLabel).toBe('résultat');
  });

  it('libre returns 1 empty bar', () => {
    const d = getGabaritDefaults('libre', REF);
    expect(d.bars).toHaveLength(1);
    expect(d.bars![0].parts).toHaveLength(0);
  });
});

describe('computeSchemaWidth', () => {
  it('single bar width = sizeMultiplier * referenceUnitMm', () => {
    const s = makeSchema({ bars: [{ label: '', value: null, sizeMultiplier: 2, couleur: 'bleu', parts: [] }] });
    expect(computeSchemaWidth(s, REF)).toBe(120); // 2 * 60
  });

  it('comparaison adds bracket space', () => {
    const s = makeSchema({
      gabarit: 'comparaison',
      bars: [
        { label: '', value: null, sizeMultiplier: 2, couleur: 'bleu', parts: [] },
        { label: '', value: null, sizeMultiplier: 1, couleur: 'rouge', parts: [] },
      ],
    });
    expect(computeSchemaWidth(s, REF)).toBeGreaterThan(120); // maxBar + bracket
  });

  it('uses the widest bar for width', () => {
    const s = makeSchema({
      gabarit: 'comparaison',
      bars: [
        { label: '', value: null, sizeMultiplier: 3, couleur: 'bleu', parts: [] },
        { label: '', value: null, sizeMultiplier: 1, couleur: 'rouge', parts: [] },
      ],
    });
    expect(computeSchemaWidth(s, REF)).toBeGreaterThanOrEqual(180); // 3 * 60
  });
});

describe('computeSchemaHeight', () => {
  it('single bar libre = bar height only', () => {
    const s = makeSchema({ gabarit: 'libre' });
    expect(computeSchemaHeight(s)).toBe(15); // no labels for libre
  });

  it('parties-tout has top + bottom label space', () => {
    const s = makeSchema({ gabarit: 'parties-tout' });
    expect(computeSchemaHeight(s)).toBe(15 + 8 + 8); // bar + top + bottom
  });

  it('comparaison with 2 bars is taller than 1 bar', () => {
    const s1 = makeSchema({ gabarit: 'comparaison', bars: [
      { label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] },
    ] });
    const s2 = makeSchema({ gabarit: 'comparaison', bars: [
      { label: '', value: null, sizeMultiplier: 2, couleur: 'bleu', parts: [] },
      { label: '', value: null, sizeMultiplier: 1, couleur: 'rouge', parts: [] },
    ] });
    expect(computeSchemaHeight(s2)).toBeGreaterThan(computeSchemaHeight(s1));
  });

  it('respects custom vertical gap', () => {
    const s = makeSchema({ gabarit: 'comparaison', bars: [
      { label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] },
      { label: '', value: null, sizeMultiplier: 1, couleur: 'rouge', parts: [] },
    ] });
    const h8 = computeSchemaHeight(s, 8);
    const h12 = computeSchemaHeight(s, 12);
    expect(h12).toBeGreaterThan(h8);
  });
});

describe('computePartLayout', () => {
  it('libre schema has no parts', () => {
    const s = makeSchema();
    const layout = computePartLayout(s, REF);
    expect(layout.parts).toHaveLength(0);
    expect(layout.bars).toHaveLength(1);
  });

  it('parties-tout with 2 parts splits bar evenly', () => {
    const s = makeSchema({
      gabarit: 'parties-tout',
      bars: [{
        label: '', value: null, sizeMultiplier: 2, couleur: 'bleu',
        parts: [
          { label: 'A', value: null, couleur: 'bleu' },
          { label: 'B', value: null, couleur: 'rouge' },
        ],
      }],
    });
    const layout = computePartLayout(s, REF);
    expect(layout.parts).toHaveLength(2);
    // Each part gets half the bar width
    expect(layout.parts[0].width).toBeCloseTo(60); // 120/2
    expect(layout.parts[1].width).toBeCloseTo(60);
    expect(layout.parts[0].x).toBe(0);
    expect(layout.parts[1].x).toBeCloseTo(60);
  });

  it('transformation has marker at boundary between parts', () => {
    const defaults = getGabaritDefaults('transformation', REF);
    const s = makeSchema(defaults);
    const layout = computePartLayout(s, REF);
    expect(layout.transformationMarker).not.toBeNull();
    expect(layout.transformationMarker!.x).toBeGreaterThan(0);
  });

  it('comparaison has difference bracket', () => {
    const defaults = getGabaritDefaults('comparaison', REF);
    const s = makeSchema(defaults);
    const layout = computePartLayout(s, REF);
    expect(layout.differenceBracket).not.toBeNull();
  });

  it('parties-tout has total bracket', () => {
    const defaults = getGabaritDefaults('parties-tout', REF);
    const s = makeSchema(defaults);
    const layout = computePartLayout(s, REF);
    expect(layout.totalBracket).not.toBeNull();
  });

  it('groupes-egaux shows multiplier label when >1 bar', () => {
    const s = makeSchema({
      gabarit: 'groupes-egaux',
      bars: [
        { label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] },
        { label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] },
        { label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] },
      ],
    });
    const layout = computePartLayout(s, REF);
    expect(layout.bars[0].multiplierLabel).toBe('×3');
  });

  it('groupes-egaux with 1 bar has no multiplier label', () => {
    const s = makeSchema({ gabarit: 'groupes-egaux' });
    const layout = computePartLayout(s, REF);
    expect(layout.bars[0].multiplierLabel).toBeNull();
  });

  it('parts with all value:0 distribute equally (no NaN)', () => {
    const s = makeSchema({
      bars: [{
        label: '', value: null, sizeMultiplier: 1, couleur: 'bleu',
        parts: [
          { label: 'A', value: 0, couleur: 'bleu' },
          { label: 'B', value: 0, couleur: 'rouge' },
        ],
      }],
    });
    const layout = computePartLayout(s, REF);
    expect(layout.parts).toHaveLength(2);
    for (const p of layout.parts) {
      expect(Number.isNaN(p.x)).toBe(false);
      expect(Number.isNaN(p.width)).toBe(false);
      expect(p.width).toBeGreaterThan(0);
    }
    // Should be equal distribution
    expect(layout.parts[0].width).toBeCloseTo(layout.parts[1].width);
  });
});
