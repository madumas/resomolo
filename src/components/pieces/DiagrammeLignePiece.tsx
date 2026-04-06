import type { DiagrammeLigne } from '../../model/types';
import { computeAutoScale, getPlotArea, DEFAULT_CHART_DIMS } from '../../engine/chart-layout';

// SVG font tiers (mm) — harmonized across all pieces
const T1 = 7;   // content: values above points
const T2 = 5.5; // labels: axis labels, point labels
const T3 = 5;   // annotation: axis tick labels

interface DiagrammeLignePieceProps {
  piece: DiagrammeLigne;
  isSelected: boolean;
  highContrast?: boolean;
  textScale?: number;
  highlightIndex?: number | null;
}

export function DiagrammeLignePiece({ piece, isSelected, highContrast, textScale = 1, highlightIndex }: DiagrammeLignePieceProps) {
  const ts = textScale;
  const { x, y, width, height, points, title } = piece;
  const dims = { ...DEFAULT_CHART_DIMS, width, height };
  const plot = getPlotArea(dims);
  const values = points.map(p => p.value);
  const axis = computeAutoScale(values);
  const n = points.length;

  // Y-axis tick positions
  const ticks: number[] = [];
  for (let v = axis.min; v <= axis.max; v += axis.step) {
    ticks.push(v);
  }

  const valueToY = (v: number) => y + plot.y + plot.height - (v - axis.min) / (axis.max - axis.min) * plot.height;
  const indexToX = (i: number) => x + plot.x + (n > 1 ? i / (n - 1) * plot.width : plot.width / 2);

  // Polyline points string
  const polylinePoints = points.map((pt, i) =>
    `${indexToX(i)},${valueToY(pt.value)}`
  ).join(' ');

  const lineColor = highContrast ? '#1E1A2E' : '#2563EB';
  const dotRadius = 2;
  const sw = highContrast ? 1.5 : 1;

  return (
    <g>
      {/* Selection highlight */}
      {isSelected && (
        <rect x={x - 2} y={y - 2} width={width + 4} height={height + 4} rx={3}
          fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={1} />
      )}

      {/* Background */}
      <rect x={x} y={y} width={width} height={height} rx={2}
        fill="#FAFAFA" stroke={isSelected ? 'none' : '#E0DDE8'} strokeWidth={0.5} />

      {/* Title */}
      {title && (
        <text x={x + width / 2} y={y + 5} textAnchor="middle" dominantBaseline="central"
          fontSize={T2 * ts} fontWeight="600" fill="#1E1A2E">
          {title}
        </text>
      )}

      {/* Horizontal grid lines */}
      {ticks.map((v, i) => (
        <line key={`grid-${i}`}
          x1={x + plot.x} y1={valueToY(v)}
          x2={x + plot.x + plot.width} y2={valueToY(v)}
          stroke="#E0DDE8" strokeWidth={0.3} strokeDasharray="2 2" />
      ))}

      {/* Y-axis */}
      <line x1={x + plot.x} y1={y + plot.y}
        x2={x + plot.x} y2={y + plot.y + plot.height}
        stroke="#55506A" strokeWidth={0.8} />

      {/* Y-axis ticks + labels */}
      {ticks.map((v, i) => (
        <g key={`ytick-${i}`}>
          <line x1={x + plot.x - 2} y1={valueToY(v)}
            x2={x + plot.x} y2={valueToY(v)}
            stroke="#55506A" strokeWidth={0.8} />
          <text x={x + plot.x - 3} y={valueToY(v)}
            textAnchor="end" dominantBaseline="central"
            fontSize={T3 * ts} fill="#55506A">
            {v}
          </text>
        </g>
      ))}

      {/* X-axis */}
      <line x1={x + plot.x} y1={y + plot.y + plot.height}
        x2={x + plot.x + plot.width} y2={y + plot.y + plot.height}
        stroke="#55506A" strokeWidth={0.8} />

      {/* Polyline connecting points */}
      {n > 1 && (
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5 * sw}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Data points */}
      {points.map((pt, i) => {
        const px = indexToX(i);
        const py = valueToY(pt.value);
        const isHighlighted = highlightIndex === i;

        return (
          <g key={`pt-${i}`}>
            {/* Point circle */}
            <circle cx={px} cy={py} r={dotRadius}
              fill={lineColor} stroke="white" strokeWidth={0.5} />

            {/* Value above point */}
            <text x={px} y={py - 3}
              textAnchor="middle" dominantBaseline="auto"
              fontSize={T1 * ts} fontWeight="600" fill="#1E1A2E">
              {pt.value}
            </text>

            {/* Label below axis */}
            <text x={px} y={y + plot.y + plot.height + 4}
              textAnchor="middle" dominantBaseline="hanging"
              fontSize={T2 * ts} fill="#55506A">
              {pt.label}
            </text>

            {/* Highlight ring during editing */}
            {isHighlighted && (
              <circle cx={px} cy={py} r={dotRadius + 3}
                fill="none" stroke="#7028e0" strokeWidth={1.5} strokeDasharray="2 2" />
            )}
          </g>
        );
      })}

      {/* Y-axis label */}
      {piece.yAxisLabel && (
        <text x={x + 3} y={y + plot.y + plot.height / 2}
          textAnchor="middle" dominantBaseline="auto"
          fontSize={T3 * ts} fill="#55506A"
          transform={`rotate(-90, ${x + 3}, ${y + plot.y + plot.height / 2})`}>
          {piece.yAxisLabel}
        </text>
      )}
    </g>
  );
}
