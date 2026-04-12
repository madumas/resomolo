import type { Schema } from '../../model/types';
import { SCHEMA_BAR_HEIGHT_MM } from '../../model/types';
import { getPieceColor, getPieceFillColor } from '../../config/theme';
import { computePartLayout } from '../../engine/schema-layout';
import { fmtNum } from '../../utils/format';

// SVG font tiers (mm) — harmonized across all pieces
const T1 = 7;   // content: part values, multiplier
const T2 = 6;   // labels: bar labels, part labels, bracket labels
const T3 = 5;   // annotation: gabarit indicator

interface SchemaPieceProps {
  piece: Schema;
  referenceUnitMm: number;
  isSelected: boolean;
  highContrast?: boolean;
  textScale?: number;
}

export function SchemaPiece({ piece, referenceUnitMm, isSelected, highContrast, textScale = 1 }: SchemaPieceProps) {
  const ts = textScale;
  const { x, y } = piece;
  const layout = computePartLayout(piece, referenceUnitMm);
  const barH = SCHEMA_BAR_HEIGHT_MM;

  return (
    <g>
      {/* Selection highlight */}
      {isSelected && (
        <rect x={x - 2} y={y - 2} width={layout.width + 4} height={layout.height + 4} rx={3}
          fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={1} />
      )}

      {/* Bars */}
      {layout.bars.map((bar, bi) => {
        const srcBar = piece.bars[bi];
        if (!srcBar) return null;
        const color = getPieceColor(srcBar.couleur, highContrast);
        const fill = getPieceFillColor(srcBar.couleur, highContrast);
        const sw = highContrast ? 1.5 : (isSelected ? 1 : 0.5);

        return (
          <g key={`bar-${bi}`}>
            {/* Bar rectangle */}
            <rect x={x + bar.x} y={y + bar.y} width={bar.width} height={bar.height}
              rx={1.5} fill={fill} stroke={color} strokeWidth={sw} />

            {/* Bar label to the left */}
            <text x={x + bar.x - 4} y={y + bar.y + barH / 2}
              textAnchor="end" dominantBaseline="central"
              fontSize={T2 * ts}
              fill={bar.label ? '#1E1A2E' : '#B0A8C0'}
              data-edit-target={`${piece.id}-bar-${bi}-label`}>
              {bar.label || '...'}
            </text>

            {/* Bar value inside (shown when bar has no parts) */}
            {srcBar.parts.length === 0 && (
              <text x={x + bar.x + bar.width / 2} y={y + bar.y + barH / 2 + 1}
                textAnchor="middle" dominantBaseline="central"
                fontSize={T1 * ts}
                fill={srcBar.value != null ? '#1E1A2E' : '#B0A8C0'}
                fontWeight={srcBar.value != null ? 600 : 400}
                fontStyle={srcBar.value != null ? 'normal' : 'italic'}
                data-edit-target={`${piece.id}-bar-${bi}-value`}>
                {srcBar.value != null ? fmtNum(srcBar.value) : '?'}
              </text>
            )}

            {/* Multiplier annotation "×N" (R15 — triple coding) — offset below first bar */}
            {bar.multiplierLabel && bi === 0 && (
              <text x={x + bar.x - 4} y={y + bar.y + barH + 6}
                textAnchor="end" dominantBaseline="central"
                fontSize={T1 * ts} fill="#55506A" fontWeight={700}>
                {bar.multiplierLabel}
              </text>
            )}
          </g>
        );
      })}

      {/* Parts within bars */}
      {layout.parts.map((part, pi) => {
        const color = getPieceColor(part.couleur, highContrast);
        const fill = getPieceFillColor(part.couleur, highContrast);
        const barInfo = layout.bars[part.barIndex];
        if (!barInfo) return null;
        const partEmpty = !part.label && part.value == null;

        return (
          <g key={`part-${pi}`}>
            {/* Part fill */}
            <rect x={x + part.x} y={y + part.y} width={part.width} height={part.height}
              fill={fill} stroke={color} strokeWidth={0.3}
              strokeDasharray={partEmpty ? '3 2' : undefined} />

            {/* Part label above */}
            <text x={x + part.x + part.width / 2} y={y + part.y - 2}
              textAnchor="middle" fontSize={T2 * ts}
              fill={part.label ? '#55506A' : '#B0A8C0'}
              data-edit-target={`${piece.id}-part-${part.barIndex}-${part.partIndex}-label`}>
              {part.label || '...'}
            </text>

            {/* Part value inside */}
            <text x={x + part.x + part.width / 2} y={y + part.y + part.height / 2 + 1}
              textAnchor="middle" dominantBaseline="central"
              fontSize={T1 * ts}
              fill={part.value != null ? '#1E1A2E' : '#B0A8C0'}
              fontWeight={part.value != null ? 600 : 400}
              fontStyle={part.value != null ? 'normal' : 'italic'}
              data-edit-target={`${piece.id}-part-${part.barIndex}-${part.partIndex}-value`}>
              {part.value != null ? fmtNum(part.value) : '?'}
            </text>

            {/* Division line (except first part) */}
            {part.partIndex > 0 && (
              <line x1={x + part.x} y1={y + part.y}
                x2={x + part.x} y2={y + part.y + part.height}
                stroke={color} strokeWidth={0.5} />
            )}
          </g>
        );
      })}

      {/* Transformation marker (R6) */}
      {layout.transformationMarker && (
        <g>
          <line x1={x + layout.transformationMarker.x} y1={y + layout.transformationMarker.y - 2}
            x2={x + layout.transformationMarker.x} y2={y + layout.transformationMarker.y + barH + 2}
            stroke="#C24B22" strokeWidth={1.5} strokeDasharray="2 1" />
        </g>
      )}

      {/* Total bracket below (parties-tout, transformation) */}
      {layout.totalBracket && (() => {
        const tb = layout.totalBracket!;
        const barWidth = layout.bars[0]?.width ?? 60;
        const bx = x;
        const by = y + tb.y;
        return (
          <g>
            {/* Bracket ⊔: ticks up, line at bottom, label below */}
            <line x1={bx} y1={by + 4} x2={bx + barWidth} y2={by + 4}
              stroke="#55506A" strokeWidth={0.8} />
            <line x1={bx} y1={by + 4} x2={bx} y2={by}
              stroke="#55506A" strokeWidth={0.8} />
            <line x1={bx + barWidth} y1={by + 4} x2={bx + barWidth} y2={by}
              stroke="#55506A" strokeWidth={0.8} />
            {/* Total label */}
            <text x={bx + barWidth / 2} y={by + 9}
              textAnchor="middle" fontSize={T2 * ts} fill="#55506A" fontWeight={500}
              data-edit-target={`${piece.id}-total`}>
              {tb.label || '?'}
            </text>
          </g>
        );
      })()}

      {/* Difference bracket horizontal (comparaison) */}
      {layout.differenceBracket && (() => {
        const db = layout.differenceBracket!;
        const bx = x + db.x;
        const by = y + db.y;
        const midY = by + db.height / 2;
        return (
          <g>
            {/* Horizontal bracket ⊔: short ticks up, line at bottom, label below */}
            <line x1={bx} y1={by + 4} x2={bx + db.width} y2={by + 4}
              stroke="#55506A" strokeWidth={0.8} />
            <line x1={bx} y1={by + 4} x2={bx} y2={by}
              stroke="#55506A" strokeWidth={0.8} />
            <line x1={bx + db.width} y1={by + 4} x2={bx + db.width} y2={by}
              stroke="#55506A" strokeWidth={0.8} />
            {/* Difference label */}
            <text x={bx + db.width / 2} y={by + 9}
              textAnchor="middle"
              fontSize={T2 * ts} fill="#55506A" fontWeight={500}
              data-edit-target={`${piece.id}-diff`}>
              {db.label}
            </text>
          </g>
        );
      })()}

      {/* Gabarit indicator (subtle, bottom-right) */}
      {piece.gabarit !== 'libre' && (
        <text x={x + layout.width} y={y + layout.height + 6}
          textAnchor="end" fontSize={T3 * ts} fill="#7A7490">
          {piece.gabarit === 'parties-tout' ? 'parties-tout' :
           piece.gabarit === 'comparaison' ? 'comparaison' :
           piece.gabarit === 'groupes-egaux' ? 'groupes égaux' :
           piece.gabarit === 'transformation' ? 'transformation' : ''}
        </text>
      )}
    </g>
  );
}
