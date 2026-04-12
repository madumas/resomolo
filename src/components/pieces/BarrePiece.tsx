import type { Barre } from '../../model/types';
import { BAR_HEIGHT_MM } from '../../model/types';
import { getPieceColor, getPieceFillColor } from '../../config/theme';
import { fmtNum } from '../../utils/format';

// SVG font tiers (mm) — harmonized across all pieces
const T1 = 7;   // content: values
const T2 = 6;   // labels: bar label
const T3 = 5;   // annotation: fraction labels

interface BarrePieceProps {
  piece: Barre;
  referenceUnitMm: number;
  isSelected: boolean;
  highContrast?: boolean;
  textScale?: number;
}

export function BarrePiece({ piece, referenceUnitMm, isSelected, highContrast, textScale = 1 }: BarrePieceProps) {
  const ts = textScale;
  const w = piece.sizeMultiplier * referenceUnitMm;
  const h = BAR_HEIGHT_MM;
  const color = getPieceColor(piece.couleur, highContrast);
  const fill = getPieceFillColor(piece.couleur, highContrast);
  const sw = highContrast ? 1.5 : (isSelected ? 1 : 0.5); // strokeWidth multiplied in high contrast
  const hasLabel = piece.label.length > 0;
  const hasValue = piece.value.length > 0;

  return (
    <g>
      {/* Label to the left of the bar */}
      <text
        x={piece.x - 4}
        y={piece.y + h / 2}
        textAnchor="end"
        dominantBaseline="central"
        fontSize={T2 * ts}
        fill={hasLabel ? '#1E1A2E' : '#B0A8C0'}
        fontWeight={hasLabel ? 500 : 400}
        data-testid="bar-label"
        data-edit-target={`${piece.id}-label`}
      >
        {piece.label || '...'}
      </text>
      <rect
        x={piece.x}
        y={piece.y}
        width={w}
        height={h}
        rx={1.5}
        fill={fill}
        stroke={piece.locked ? '#9CA3AF' : color}
        strokeWidth={sw}
        strokeDasharray={!hasLabel && !hasValue ? '3 2' : undefined}
      />
      {/* Colored subdivision parts */}
      {piece.divisions && piece.coloredParts && piece.coloredParts.map(partIdx => {
        if (partIdx < 0 || partIdx >= piece.divisions!) return null;
        const partW = w / piece.divisions!;
        return <rect key={`cp-${partIdx}`}
          x={piece.x + partIdx * partW} y={piece.y}
          width={partW} height={h} rx={partIdx === 0 ? 1.5 : 0}
          fill={color} fillOpacity={0.35} />;
      })}
      {/* Subdivision lines */}
      {piece.divisions && piece.divisions > 1 && Array.from({ length: piece.divisions - 1 }, (_, i) => {
        const dx = (w / piece.divisions!) * (i + 1);
        return <line key={i} x1={piece.x + dx} y1={piece.y} x2={piece.x + dx} y2={piece.y + h}
          stroke={color} strokeWidth={0.3} strokeOpacity={0.5} />;
      })}
      {/* Value or size multiplier inside the bar */}
      <text
        x={piece.x + w / 2}
        y={piece.y + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={T1 * ts}
        fill={hasValue ? (piece.locked ? '#9CA3AF' : '#1E1A2E') : '#B0A8C0'}
        fontWeight={hasValue ? 600 : 400}
        fontStyle={hasValue ? 'normal' : 'italic'}
        data-edit-target={`${piece.id}-value`}
      >
        {hasValue ? fmtNum(piece.value) : '?'}
      </text>
      {/* Part labels under each subdivision when showFraction */}
      {piece.showFraction && piece.divisions && piece.divisions > 1 && (
        Array.from({ length: piece.divisions }, (_, i) => {
          const partW = w / piece.divisions!;
          const partX = piece.x + partW * i + partW / 2;
          return (
            <text key={`pl-${i}`} x={partX} y={piece.y - 3}
              textAnchor="middle" fontSize={T3 * ts} fill="#55506A">
              {i + 1}/{piece.divisions}
            </text>
          );
        })
      )}
      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={piece.x - 2}
          y={piece.y - 2}
          width={w + 4}
          height={h + 4}
          rx={3}
          fill="rgba(112, 40, 224, 0.06)"
          stroke="#7028e0"
          strokeWidth={1}
        />
      )}
    </g>
  );
}
