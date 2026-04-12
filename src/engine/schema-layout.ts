import type { Schema, SchemaGabarit, SchemaBar, CouleurPiece } from '../model/types';
import { SCHEMA_BAR_HEIGHT_MM } from '../model/types';

// === Layout types ===

export interface PartLayoutInfo {
  barIndex: number;
  partIndex: number;
  x: number;      // left edge, mm relative to piece origin
  y: number;      // top edge
  width: number;
  height: number;
  label: string;
  value: number | null;
  couleur: CouleurPiece;
}

export interface SchemaLayoutInfo {
  bars: { x: number; y: number; width: number; height: number; label: string; multiplierLabel: string | null }[];
  parts: PartLayoutInfo[];
  totalBracket: { x: number; y: number; height: number; label: string } | null;
  differenceBracket: { x: number; y: number; width: number; height: number; label: string } | null;
  transformationMarker: { x: number; y: number } | null;
  width: number;
  height: number;
}

// === Constants ===

const VERTICAL_GAP = 8; // mm between bars (base, scales with tolerance)
const BRACKET_WIDTH = 8; // mm width of accolade
const LABEL_HEIGHT = 8;  // mm space for labels above/below

// === Public API ===

export function computeSchemaWidth(schema: Schema, referenceUnitMm: number): number {
  if (schema.bars.length === 0) return 0;
  const maxBarWidth = schema.bars.reduce(
    (max, bar) => Math.max(max, bar.sizeMultiplier * referenceUnitMm),
    referenceUnitMm,
  );
  // Add space for brackets on the right
  const hasBracket = schema.gabarit === 'comparaison' || schema.gabarit === 'groupes-egaux';
  return maxBarWidth + (hasBracket ? BRACKET_WIDTH + 4 : 0);
}

export function computeSchemaHeight(schema: Schema, verticalGap: number = VERTICAL_GAP): number {
  const barCount = Math.max(1, schema.bars.length);
  const barH = SCHEMA_BAR_HEIGHT_MM;
  const barsHeight = barCount * barH + (barCount - 1) * verticalGap;

  // Add label space
  const hasTopLabel = schema.gabarit !== 'libre';
  const hasBottomLabel = schema.gabarit === 'parties-tout' || schema.gabarit === 'transformation' || schema.gabarit === 'comparaison';
  return barsHeight + (hasTopLabel ? LABEL_HEIGHT : 0) + (hasBottomLabel ? LABEL_HEIGHT : 0);
}

/**
 * Get default structure for a gabarit.
 * Follows R3: parties-tout starts undivided, groupes-egaux starts with 1 bar.
 */
export function getGabaritDefaults(gabarit: SchemaGabarit, referenceUnitMm: number): Partial<Schema> {
  const defaultBar = (sm: number, couleur: CouleurPiece = 'bleu'): SchemaBar => ({
    label: '', value: null, sizeMultiplier: sm, couleur, parts: [],
  });

  switch (gabarit) {
    case 'parties-tout':
      // R3: undivided bar, child adds parts via ContextActions
      return {
        gabarit,
        bars: [defaultBar(2)],
        totalLabel: '',
        totalValue: null,
        referenceWidth: 2 * referenceUnitMm,
      };

    case 'comparaison':
      return {
        gabarit,
        bars: [defaultBar(2, 'bleu'), defaultBar(1, 'rouge')],
        totalLabel: '',
        totalValue: null,
        referenceWidth: 2 * referenceUnitMm,
      };

    case 'groupes-egaux':
      // R3: start with 1 bar, child adds more
      return {
        gabarit,
        bars: [defaultBar(1)],
        totalLabel: '',
        totalValue: null,
        referenceWidth: referenceUnitMm,
      };

    case 'transformation':
      // R6: bar with intermediate marker (start + change segments)
      return {
        gabarit,
        bars: [
          { label: '', value: null, sizeMultiplier: 2, couleur: 'bleu',
            parts: [
              { label: 'départ', value: null, couleur: 'bleu' },
              { label: 'changement', value: null, couleur: 'vert' },
            ] },
        ],
        totalLabel: 'résultat',
        totalValue: null,
        referenceWidth: 2 * referenceUnitMm,
      };

    case 'libre':
    default:
      return {
        gabarit: 'libre',
        bars: [defaultBar(1)],
        totalLabel: '',
        totalValue: null,
        referenceWidth: referenceUnitMm,
      };
  }
}

/**
 * Compute full layout info for rendering.
 */
export function computePartLayout(
  schema: Schema,
  referenceUnitMm: number,
  verticalGap: number = VERTICAL_GAP,
): SchemaLayoutInfo {
  const barH = SCHEMA_BAR_HEIGHT_MM;
  const hasTopLabel = schema.gabarit !== 'libre';
  const topOffset = hasTopLabel ? LABEL_HEIGHT : 0;

  const bars: SchemaLayoutInfo['bars'] = [];
  const parts: PartLayoutInfo[] = [];
  let totalBracket: SchemaLayoutInfo['totalBracket'] = null;
  let differenceBracket: SchemaLayoutInfo['differenceBracket'] = null;
  let transformationMarker: SchemaLayoutInfo['transformationMarker'] = null;

  let maxBarRight = 0;

  for (let bi = 0; bi < schema.bars.length; bi++) {
    const bar = schema.bars[bi];
    const barWidth = bar.sizeMultiplier * referenceUnitMm;
    const barY = topOffset + bi * (barH + verticalGap);

    const multiplierLabel = schema.gabarit === 'groupes-egaux' && schema.bars.length > 1
      ? `×${schema.bars.length}`
      : null;

    bars.push({ x: 0, y: barY, width: barWidth, height: barH, label: bar.label, multiplierLabel });
    maxBarRight = Math.max(maxBarRight, barWidth);

    // Parts within this bar
    if (bar.parts.length > 0) {
      const rawTotal = bar.parts.reduce((s, p) => s + (p.value ?? 1), 0);
      const equalDistribution = rawTotal === 0;
      const totalPartsValue = equalDistribution ? bar.parts.length || 1 : rawTotal;
      let partX = 0;

      for (let pi = 0; pi < bar.parts.length; pi++) {
        const part = bar.parts[pi];
        const partRatio = equalDistribution ? 1 / totalPartsValue : (part.value ?? 1) / totalPartsValue;
        const partWidth = barWidth * partRatio;

        parts.push({
          barIndex: bi,
          partIndex: pi,
          x: partX,
          y: barY,
          width: partWidth,
          height: barH,
          label: part.label,
          value: part.value,
          couleur: part.couleur,
        });
        partX += partWidth;
      }
    }

    // Transformation marker: between the two parts
    if (schema.gabarit === 'transformation' && bar.parts.length >= 2 && bi === 0) {
      const tmRaw = bar.parts.reduce((s, p) => s + (p.value ?? 1), 0);
      const tmTotal = tmRaw || bar.parts.length || 1;
      const firstPartRatio = tmRaw === 0 ? 1 / (bar.parts.length || 1) : (bar.parts[0].value ?? 1) / tmTotal;
      transformationMarker = {
        x: barWidth * firstPartRatio,
        y: barY,
      };
    }
  }

  const barsHeight = Math.max(1, schema.bars.length) * barH +
    Math.max(0, schema.bars.length - 1) * verticalGap;

  // Brackets
  if (schema.gabarit === 'parties-tout' || schema.gabarit === 'transformation') {
    totalBracket = {
      x: 0,
      y: topOffset + barsHeight + 2,
      height: LABEL_HEIGHT,
      label: schema.totalLabel || (schema.gabarit === 'transformation' ? 'résultat' : 'total'),
    };
  }

  if (schema.gabarit === 'comparaison' && schema.bars.length >= 2) {
    const bar1W = schema.bars[0].sizeMultiplier * referenceUnitMm;
    const bar2W = schema.bars[1].sizeMultiplier * referenceUnitMm;
    const shorterW = Math.min(bar1W, bar2W);
    const longerW = Math.max(bar1W, bar2W);
    // Bracket below bar 2 (shorter), ⊔ shape pointing up to emphasize the gap
    const bar2Bottom = topOffset + 2 * barH + verticalGap;
    differenceBracket = {
      x: shorterW,
      y: bar2Bottom + 1,
      width: longerW - shorterW,
      height: LABEL_HEIGHT,
      label: schema.totalLabel || '?',
    };
  }

  const width = computeSchemaWidth(schema, referenceUnitMm);
  const height = computeSchemaHeight(schema, verticalGap);

  return { bars, parts, totalBracket, differenceBracket, transformationMarker, width, height };
}
