import type { DroiteNumerique } from '../../model/types';

export function DroiteNumeriquePiece({ piece, isSelected }: {
  piece: DroiteNumerique;
  isSelected: boolean;
}) {
  const { x, y, min, max, step, markers, width } = piece;

  // C2: if min >= max, render fallback
  if (min >= max) {
    return (
      <g>
        {isSelected && (
          <rect x={x - 2} y={y - 10} width={width + 4} height={24} rx={2}
            fill="none" stroke="#185FA5" strokeWidth={0.5} strokeDasharray="2 1" />
        )}
        <line x1={x} y1={y} x2={x + width} y2={y}
          stroke="#55506A" strokeWidth={1} />
        <text x={x + width / 2} y={y + 8} textAnchor="middle" fontSize={4} fill="#B91C1C">
          Ajuster min/max
        </text>
      </g>
    );
  }

  // C1: guard against division by zero when step=0
  const safeStep = Math.max(0.1, step);
  const numTicks = Math.floor((max - min) / safeStep) + 1;
  const tickSpacing = numTicks > 1 ? width / (numTicks - 1) : width;
  const h = 20; // total height including labels

  return (
    <g>
      {/* Selection highlight */}
      {isSelected && (
        <rect x={x - 2} y={y - 10} width={width + 4} height={h + 4} rx={2}
          fill="none" stroke="#185FA5" strokeWidth={0.5} strokeDasharray="2 1" />
      )}

      {/* Main line */}
      <line x1={x} y1={y} x2={x + width} y2={y}
        stroke="#55506A" strokeWidth={1} />

      {/* Arrow heads at both ends */}
      <polygon points={`${x - 3},${y} ${x + 2},${y - 2} ${x + 2},${y + 2}`} fill="#55506A" />
      <polygon points={`${x + width + 3},${y} ${x + width - 2},${y - 2} ${x + width - 2},${y + 2}`} fill="#55506A" />

      {/* Tick marks and labels */}
      {Array.from({ length: numTicks }, (_, i) => {
        const val = min + i * safeStep;
        const tx = x + i * tickSpacing;
        return (
          <g key={i}>
            <line x1={tx} y1={y - 3} x2={tx} y2={y + 3}
              stroke="#55506A" strokeWidth={0.5} />
            <text x={tx} y={y + 8} textAnchor="middle" fontSize={4} fill="#55506A">
              {val}
            </text>
          </g>
        );
      })}

      {/* Markers (child-placed dots) */}
      {markers.map((val, i) => {
        const mx = x + ((val - min) / (max - min)) * width;
        return (
          <circle key={i} cx={mx} cy={y} r={2.5}
            fill="#185FA5" stroke="#fff" strokeWidth={0.5} />
        );
      })}
    </g>
  );
}
