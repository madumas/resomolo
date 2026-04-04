import type { Barre } from '../../model/types';
import { BAR_HEIGHT_MM } from '../../model/types';
import { getPieceColor, getPieceFillColor } from '../../config/theme';

interface BarrePieceProps {
  piece: Barre;
  referenceUnitMm: number;
  isSelected: boolean;
  highContrast?: boolean;
}

export function BarrePiece({ piece, referenceUnitMm, isSelected, highContrast }: BarrePieceProps) {
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
        fontSize={5}
        fill={hasLabel ? '#1E1A2E' : 'transparent'}
        data-testid="bar-label"
        data-edit-target={`${piece.id}-label`}
      >
        {piece.label || ' '}
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
        fontSize={6}
        fill={hasValue ? (piece.locked ? '#9CA3AF' : '#1E1A2E') : (!hasLabel ? (piece.locked ? '#9CA3AF' : color) : 'transparent')}
        fontWeight={600}
        opacity={hasValue ? 1 : 0.5}
        data-edit-target={`${piece.id}-value`}
      >
        {hasValue ? piece.value : ' '}
      </text>
      {/* Fraction label (stacked notation) — auto when showFraction + colored parts */}
      {piece.showFraction && piece.divisions && piece.coloredParts.length > 0 && (
        <g>
          <text
            x={piece.x + w / 2}
            y={piece.y + h + 5}
            textAnchor="middle"
            fontSize={6}
            fill="#55506A"
          >
            {piece.coloredParts.length}
          </text>
          <line
            x1={piece.x + w / 2 - 5}
            y1={piece.y + h + 7}
            x2={piece.x + w / 2 + 5}
            y2={piece.y + h + 7}
            stroke="#55506A"
            strokeWidth={0.5}
          />
          <text
            x={piece.x + w / 2}
            y={piece.y + h + 12}
            textAnchor="middle"
            fontSize={6}
            fill="#55506A"
          >
            {piece.divisions}
          </text>
        </g>
      )}
      {/* Part labels under each subdivision when showFraction */}
      {piece.showFraction && piece.divisions && piece.divisions > 1 && (
        Array.from({ length: piece.divisions }, (_, i) => {
          const partW = w / piece.divisions!;
          const partX = piece.x + partW * i + partW / 2;
          return (
            <text key={`pl-${i}`} x={partX} y={piece.y - 3}
              textAnchor="middle" fontSize={5} fill="#55506A">
              {i + 1}/{piece.divisions}
            </text>
          );
        })
      )}
      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={piece.x - 1}
          y={piece.y - 1}
          width={w + 2}
          height={h + 2}
          rx={2.5}
          fill="rgba(112, 40, 224, 0.06)"
          stroke="#7028e0"
          strokeWidth={1}
        />
      )}
    </g>
  );
}
