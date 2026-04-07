import type { DroiteNumerique } from '../../model/types';

export function DroiteNumeriquePiece({ piece, isSelected, textScale = 1 }: {
  piece: DroiteNumerique;
  isSelected: boolean;
  textScale?: number;
}) {
  const ts = textScale;
  const { x, y, min, max, step, markers, width } = piece;

  // C2: if min >= max, render fallback
  if (min >= max) {
    return (
      <g>
        {isSelected && (
          <rect x={x - 2} y={y - 10} width={width + 4} height={24} rx={2}
            fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={1} />
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
  // Increase label skip when textScale makes labels wider to avoid overlap
  const scaledTicks = numTicks * ts;
  const labelEvery = scaledTicks > 50 ? 10 : scaledTicks > 20 ? 5 : numTicks > 10 && ts > 1.2 ? 2 : 1;
  const h = 20; // total height including labels

  return (
    <g>
      {/* Selection highlight */}
      {isSelected && (
        <rect x={x - 2} y={y - 10} width={width + 4} height={h + 4} rx={2}
          fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={1} />
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
        const isZero = min < 0 && Math.abs(val) < 1e-9;
        return (
          <g key={i}>
            <line x1={tx} y1={y - 3} x2={tx} y2={y + 3}
              stroke={isZero ? '#7028E0' : '#55506A'}
              strokeWidth={isZero ? 2.5 : (i % labelEvery === 0 ? 0.7 : 0.3)} />
            {(i % labelEvery === 0 || isZero) && (
              <text x={tx} y={y + 9} textAnchor="middle"
                fontSize={(isZero ? 8 : 7) * ts}
                fontWeight={isZero ? 700 : 500}
                fill={isZero ? '#7028E0' : '#55506A'}>
                {val}
              </text>
            )}
          </g>
        );
      })}

      {/* Markers (child-placed dots) with value labels */}
      {markers.map((val, i) => {
        const mx = x + ((val - min) / (max - min)) * width;
        return (
          <g key={i}>
            <circle cx={mx} cy={y} r={4}
              fill="#185FA5" stroke="#fff" strokeWidth={0.7} />
            <text x={mx} y={y - 7} textAnchor="middle" fontSize={7 * ts} fontWeight={600} fill="#185FA5">
              {val}
            </text>
          </g>
        );
      })}
    </g>
  );
}
