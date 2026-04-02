import type { Barre } from '../../model/types';
import { BAR_HEIGHT_MM } from '../../model/types';
import { getPieceColor, getPieceFillColor } from '../../config/theme';

interface BarrePieceProps {
  piece: Barre;
  referenceUnitMm: number;
  isSelected: boolean;
}

export function BarrePiece({ piece, referenceUnitMm, isSelected }: BarrePieceProps) {
  const w = piece.sizeMultiplier * referenceUnitMm;
  const h = BAR_HEIGHT_MM;
  const color = getPieceColor(piece.couleur);
  const fill = getPieceFillColor(piece.couleur);
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
        fill={hasLabel ? '#1A2433' : 'transparent'}
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
        strokeWidth={isSelected ? 1 : 0.5}
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
        fill={hasValue ? (piece.locked ? '#9CA3AF' : '#1A2433') : (!hasLabel ? (piece.locked ? '#9CA3AF' : color) : 'transparent')}
        fontWeight={600}
        opacity={hasValue ? 1 : 0.5}
        data-edit-target={`${piece.id}-value`}
      >
        {hasValue ? piece.value : (!hasLabel ? `${piece.sizeMultiplier}×` : ' ')}
      </text>
      {/* Selection highlight */}
      {isSelected && (
        <rect
          x={piece.x - 1}
          y={piece.y - 1}
          width={w + 2}
          height={h + 2}
          rx={2.5}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          strokeDasharray="2 1"
        />
      )}
    </g>
  );
}
