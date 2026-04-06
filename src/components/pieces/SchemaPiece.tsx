import type { Schema } from '../../model/types';
import { SCHEMA_BAR_HEIGHT_MM } from '../../model/types';
import { getPieceColor, getPieceFillColor } from '../../config/theme';
import { computePartLayout } from '../../engine/schema-layout';

interface SchemaPieceProps {
  piece: Schema;
  referenceUnitMm: number;
  isSelected: boolean;
  highContrast?: boolean;
}

export function SchemaPiece({ piece, referenceUnitMm, isSelected, highContrast }: SchemaPieceProps) {
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
            {bar.label && (
              <text x={x + bar.x - 4} y={y + bar.y + barH / 2}
                textAnchor="end" dominantBaseline="central"
                fontSize={6} fill="#1E1A2E"
                data-edit-target={`${piece.id}-bar-${bi}-label`}>
                {bar.label}
              </text>
            )}

            {/* Multiplier annotation "×N" (R15 — triple coding) — offset below first bar */}
            {bar.multiplierLabel && bi === 0 && (
              <text x={x + bar.x - 4} y={y + bar.y + barH + 6}
                textAnchor="end" dominantBaseline="central"
                fontSize={6} fill="#55506A" fontWeight={700}>
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

        return (
          <g key={`part-${pi}`}>
            {/* Part fill */}
            <rect x={x + part.x} y={y + part.y} width={part.width} height={part.height}
              fill={fill} stroke={color} strokeWidth={0.3} />

            {/* Part label above */}
            {part.label && (
              <text x={x + part.x + part.width / 2} y={y + part.y - 2}
                textAnchor="middle" fontSize={5.5} fill="#55506A"
                data-edit-target={`${piece.id}-part-${part.barIndex}-${part.partIndex}-label`}>
                {part.label}
              </text>
            )}

            {/* Part value inside */}
            {part.value !== null && (
              <text x={x + part.x + part.width / 2} y={y + part.y + part.height / 2 + 1}
                textAnchor="middle" dominantBaseline="central"
                fontSize={6} fill="#1E1A2E" fontWeight={600}>
                {part.value}
              </text>
            )}

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
            {/* Bracket line */}
            <path d={`M${bx},${by} L${bx},${by + 4} L${bx + barWidth},${by + 4} L${bx + barWidth},${by}`}
              stroke="#55506A" strokeWidth={0.8} fill="none" />
            {/* Total label */}
            <text x={bx + barWidth / 2} y={by + 9}
              textAnchor="middle" fontSize={6} fill="#55506A" fontWeight={500}
              data-edit-target={`${piece.id}-total`}>
              {tb.label || '?'}
            </text>
          </g>
        );
      })()}

      {/* Difference bracket right (comparaison) */}
      {layout.differenceBracket && (() => {
        const db = layout.differenceBracket!;
        const bx = x + db.x;
        const by = y + db.y;
        return (
          <g>
            {/* Bracket line */}
            <path d={`M${bx},${by} L${bx + 5},${by} L${bx + 5},${by + db.height} L${bx},${by + db.height}`}
              stroke="#55506A" strokeWidth={0.8} fill="none" />
            {/* Difference label */}
            <text x={bx + 9} y={by + db.height / 2}
              dominantBaseline="central" fontSize={6} fill="#55506A" fontWeight={500}
              data-edit-target={`${piece.id}-diff`}>
              {db.label}
            </text>
          </g>
        );
      })()}

      {/* Gabarit indicator (subtle, bottom-right) */}
      {piece.gabarit !== 'libre' && (
        <text x={x + layout.width} y={y + layout.height + 6}
          textAnchor="end" fontSize={4} fill="#B0A8C0" fontStyle="italic">
          {piece.gabarit === 'parties-tout' ? 'parties-tout' :
           piece.gabarit === 'comparaison' ? 'comparaison' :
           piece.gabarit === 'groupes-egaux' ? 'groupes égaux' :
           piece.gabarit === 'transformation' ? 'transformation' : ''}
        </text>
      )}
    </g>
  );
}
