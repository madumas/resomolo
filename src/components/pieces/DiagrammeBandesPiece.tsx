import type { DiagrammeBandes } from '../../model/types';
import { getPieceColor, getPieceFillColor } from '../../config/theme';
import { computeAutoScale, getPlotArea, DEFAULT_CHART_DIMS } from '../../engine/chart-layout';

// SVG font tiers (mm) — harmonized across all pieces
const T1 = 7;   // content: values above bars
const T2 = 5.5; // labels: axis labels, category labels
const T3 = 5;   // annotation: axis tick labels

interface DiagrammeBandesPieceProps {
  piece: DiagrammeBandes;
  isSelected: boolean;
  highContrast?: boolean;
  textScale?: number;
  highlightIndex?: number | null;
}

export function DiagrammeBandesPiece({ piece, isSelected, highContrast, textScale = 1, highlightIndex }: DiagrammeBandesPieceProps) {
  const ts = textScale;
  const { x, y, height, categories, title } = piece;
  // Auto-resize width when more than 6 categories
  const width = Math.max(piece.width, categories.length * 18);
  const dims = { ...DEFAULT_CHART_DIMS, width, height };
  const plot = getPlotArea(dims);
  const values = categories.map(c => c.value);
  const axis = computeAutoScale(values);
  const n = categories.length;

  // Bar geometry
  const barGroupWidth = plot.width / Math.max(n, 1);
  const barWidth = barGroupWidth * 0.7;
  const barGap = barGroupWidth * 0.15;

  // Y-axis tick positions
  const ticks: number[] = [];
  for (let v = axis.min; v <= axis.max; v += axis.step) {
    ticks.push(v);
  }

  const valueToY = (v: number) => y + plot.y + plot.height - (v - axis.min) / (axis.max - axis.min) * plot.height;

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
      <text x={x + width / 2} y={y + 5} textAnchor="middle" dominantBaseline="central"
        fontSize={T2 * ts} fontWeight="600" fill={title ? '#1E1A2E' : '#B0A8C0'}
        opacity={title ? 1 : 0.5}
        data-edit-target={piece.id}>
        {title || 'Titre...'}
      </text>

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
            {String(v).replace('.', ',')}
          </text>
        </g>
      ))}

      {/* X-axis */}
      <line x1={x + plot.x} y1={y + plot.y + plot.height}
        x2={x + plot.x + plot.width} y2={y + plot.y + plot.height}
        stroke="#55506A" strokeWidth={0.8} />

      {/* Bars */}
      {categories.map((cat, i) => {
        const barX = x + plot.x + i * barGroupWidth + barGap;
        const barH = (cat.value - axis.min) / (axis.max - axis.min) * plot.height;
        const barY = y + plot.y + plot.height - barH;
        const color = getPieceColor(cat.couleur, highContrast);
        const fill = getPieceFillColor(cat.couleur, highContrast);
        const isHighlighted = highlightIndex === i;
        const sw = isHighlighted ? 2 : (highContrast ? 1.2 : 0.8);

        return (
          <g key={`bar-${i}`}>
            {/* Bar rectangle */}
            <rect x={barX} y={barY} width={barWidth} height={Math.max(barH, 0.5)}
              rx={1} fill={fill} stroke={color} strokeWidth={sw} />

            {/* Value above bar */}
            {cat.value > 0 && (
              <text x={barX + barWidth / 2} y={barY - 2}
                textAnchor="middle" dominantBaseline="auto"
                fontSize={T1 * ts} fontWeight="600" fill="#1E1A2E">
                {String(cat.value).replace('.', ',')}
              </text>
            )}

            {/* Category label below axis */}
            <text x={barX + barWidth / 2} y={y + plot.y + plot.height + 4}
              textAnchor={n > 6 ? 'end' : 'middle'} dominantBaseline="hanging"
              fontSize={T2 * ts} fill="#55506A"
              transform={n > 6 ? `rotate(-30, ${barX + barWidth / 2}, ${y + plot.y + plot.height + 4})` : undefined}>
              {cat.label}
            </text>

            {/* Highlight ring during editing */}
            {isHighlighted && (
              <rect x={barX - 1} y={barY - 1} width={barWidth + 2} height={barH + 2}
                rx={2} fill="none" stroke="#7028e0" strokeWidth={1.5} strokeDasharray="3 2" />
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
