import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import type { DroiteNumerique } from '../../model/types';
import { computeAllBondLevels, computeBondPath, computeAutoLabel, getImplicitMarkers, isMarkerCoveredByPositiveBond, isMarkerCoveredByNegativeBond } from '../../engine/bonds';

export function DroiteNumeriquePiece({ piece, isSelected, textScale = 1, selectedBondIndex, bondMode, bondFromVal, toleranceMultiplier = 1, toolbarMode = 'essentiel' }: {
  piece: DroiteNumerique;
  isSelected: boolean;
  textScale?: number;
  selectedBondIndex?: number;
  bondMode?: boolean;
  bondFromVal?: number | null;
  toleranceMultiplier?: number;
  toolbarMode?: 'essentiel' | 'complet';
}) {
  const ts = textScale;
  const { x, y, min, max, step, markers, width } = piece;
  const bonds = piece.bonds ?? [];

  // Track bond count for animation
  const prevBondCount = useRef(bonds.length);
  const lastBondTime = useRef(0);
  const [newBondIndex, setNewBondIndex] = useState<number | null>(null);

  // useLayoutEffect runs synchronously before browser paint — no label flash
  useLayoutEffect(() => {
    if (bonds.length > prevBondCount.current) {
      const now = Date.now();
      const elapsed = now - lastBondTime.current;
      if (elapsed > 200) {
        setNewBondIndex(bonds.length - 1);
        lastBondTime.current = now;
      }
    }
    prevBondCount.current = bonds.length;
  }, [bonds.length]);

  // Clear newBondIndex after animation completes (separate effect, can be async)
  useEffect(() => {
    if (newBondIndex === null) return;
    const timer = setTimeout(() => setNewBondIndex(null), 350);
    return () => clearTimeout(timer);
  }, [newBondIndex]);

  // Refs for measuring path lengths (for stroke-dashoffset animation)
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [pathLengths, setPathLengths] = useState<number[]>([]);

  useEffect(() => {
    const lengths = pathRefs.current.map(el => el?.getTotalLength() ?? 0);
    setPathLengths(lengths);
  }, [bonds.length, min, max, width]);

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
  const scaledTicks = numTicks * ts;
  const labelEvery = scaledTicks > 50 ? 10 : scaledTicks > 20 ? 5 : numTicks > 10 && ts > 1.2 ? 2 : 1;
  const h = 20;

  // Bond levels for stacking
  const bondLevels = computeAllBondLevels(bonds);
  const pieceRect = { x, y, min, max, width };

  // Merge explicit markers with implicit ones from bonds
  const implicitMarkers = getImplicitMarkers(bonds);
  const allMarkerVals = [...new Set([...markers, ...implicitMarkers])].sort((a, b) => a - b);

  return (
    <g>
      {/* Selection highlight */}
      {isSelected && (
        <rect x={x - 2} y={y - 10} width={width + 4} height={h + 4} rx={2}
          fill="rgba(112, 40, 224, 0.06)"
          stroke={bondMode ? '#185FA5' : '#7028e0'}
          strokeWidth={1}
          style={bondMode ? { animation: 'bond-mode-pulse 1.5s ease-in-out infinite' } : undefined} />
      )}

      {/* Main line */}
      <line x1={x} y1={y} x2={x + width} y2={y}
        stroke="#55506A" strokeWidth={1} />

      {/* Arrow heads at both ends */}
      <polygon points={`${x - 3},${y} ${x + 2},${y - 2} ${x + 2},${y + 2}`} fill="#55506A" />
      <polygon points={`${x + width + 3},${y} ${x + width - 2},${y - 2} ${x + width - 2},${y + 2}`} fill="#55506A" />

      {/* Bond arcs */}
      {bonds.map((bond, i) => {
        const info = computeBondPath(bond, pieceRect, bondLevels[i]);
        if (!info.path) return null;
        const isSel = selectedBondIndex === i;
        const isNew = newBondIndex === i;
        const pl = pathLengths[i] ?? 0;

        // Label position: midpoint of the actual Bézier curve (halfway between y and cpY)
        // The quadratic Bézier reaches its max at t=0.5 which is at (y + cpY) / 2
        const labelArcY = (y + info.cpY) / 2;
        // Offset label slightly beyond the arc peak
        const labelY = info.direction === -1
          ? labelArcY - 2  // above: label above the arc midpoint
          : labelArcY + 5 * ts; // below: label below the arc midpoint

        return (
          <g key={`bond-${i}`}>
            {/* Invisible hit-test path (enlarged) */}
            <path d={info.path} fill="none"
              stroke="transparent"
              strokeWidth={10 * toleranceMultiplier}
              pointerEvents="stroke"
              data-bond-index={i} />
            {/* Visible arc */}
            <path
              ref={el => { pathRefs.current[i] = el; }}
              d={info.path} fill="none"
              stroke={isSel ? '#7028E0' : '#185FA5'}
              strokeWidth={isSel ? 2 : 1.5}
              pointerEvents="none"
              className={isNew && pl > 0 ? 'bond-new' : undefined}
              style={isNew && pl > 0 ? { '--path-length': `${pl}` } as React.CSSProperties : undefined} />
            {/* Label background + text — hidden during arc draw animation */}
            {!isNew && (() => {
              // Display label: recalculate from mode unless child edited it manually
              const autoLabel = computeAutoLabel(toolbarMode, bond.from, bond.to);
              const otherModeLabel = computeAutoLabel(toolbarMode === 'essentiel' ? 'complet' : 'essentiel', bond.from, bond.to);
              const isAutoGenerated = bond.label === autoLabel || bond.label === otherModeLabel;
              const displayLabel = isAutoGenerated ? autoLabel : (bond.label || autoLabel);
              return displayLabel ? (
                <>
                  <rect
                    x={info.midX - (displayLabel.length * 2.5 * ts + 2)}
                    y={labelY - 4.5 * ts}
                    width={displayLabel.length * 5 * ts + 4}
                    height={8 * ts}
                    rx={2}
                    fill="rgba(255,255,255,0.85)"
                    pointerEvents="none" />
                  <text x={info.midX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.max(7 * ts, 5)}
                    fontWeight={600}
                    fill={isSel ? '#7028E0' : '#185FA5'}
                    pointerEvents="none">
                    {displayLabel}
                  </text>
                </>
              ) : null;
            })()}
          </g>
        );
      })}

      {/* Tick marks and labels */}
      {Array.from({ length: numTicks }, (_, i) => {
        const rawVal = min + i * safeStep;
        // Round to step precision to avoid floating-point artifacts (e.g. 3.5999999999996)
        const stepDecimals = (String(safeStep).split('.')[1] || '').length;
        const val = parseFloat(rawVal.toFixed(Math.max(stepDecimals, (String(min).split('.')[1] || '').length)));
        const tx = x + i * tickSpacing;
        const isZero = min < 0 && Math.abs(val) < 1e-9;
        const displayVal = String(val).replace('.', ',');
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
                {displayVal}
              </text>
            )}
          </g>
        );
      })}

      {/* Markers (child-placed dots + implicit bond endpoints) */}
      {allMarkerVals.map((val, i) => {
        const mx = x + ((val - min) / (max - min)) * width;
        const isExplicit = markers.includes(val);
        const isBondEndpoint = bonds.some(b => Math.abs(b.from - val) < 1e-9 || Math.abs(b.to - val) < 1e-9);
        const isBondFrom = bondFromVal !== null && bondFromVal !== undefined && Math.abs(val - bondFromVal) < 1e-9;
        const coveredByPositive = isMarkerCoveredByPositiveBond(val, bonds);
        const coveredByNegative = isMarkerCoveredByNegativeBond(val, bonds);
        // Default: label above. Move below if positive bond covers it. If both cover it, prefer above (less crowded).
        const labelBelow = coveredByPositive && !coveredByNegative;
        const markerLabelY = labelBelow ? y + 9 + 7 * ts : y - 7;
        const isBondEndpointSel = selectedBondIndex !== undefined && selectedBondIndex >= 0 &&
          bonds[selectedBondIndex] && (
            Math.abs(val - bonds[selectedBondIndex].from) < 1e-9 ||
            Math.abs(val - bonds[selectedBondIndex].to) < 1e-9
          );
        // Hide marker label when it duplicates a visible tick label (reduces visual clutter)
        const tickIndex = Math.round((val - min) / safeStep);
        const isZeroTick = min < 0 && Math.abs(val) < 1e-9;
        const hasVisibleTickLabel = (tickIndex % labelEvery === 0 || isZeroTick) && tickIndex >= 0 && tickIndex < numTicks;
        const showMarkerLabel = !hasVisibleTickLabel; // blue dot is enough when tick label is visible
        const canDelete = isSelected && isExplicit && !bondMode && !isBondFrom;
        const r = isBondFrom ? 5.5 : isBondEndpointSel ? 5 : 4;
        return (
          <g key={`m-${i}`} className={canDelete ? 'marker-deletable' : undefined}
            style={canDelete ? { cursor: 'pointer' } : undefined}>
            <circle cx={mx} cy={y}
              r={r}
              fill={isExplicit || isBondEndpoint || isBondFrom ? '#185FA5' : 'rgba(24, 95, 165, 0.4)'}
              stroke="#fff" strokeWidth={0.7}
              style={isBondFrom ? { animation: 'marker-pulse 1.5s ease-in-out infinite' } : undefined} />
            {canDelete && (
              <g className="marker-x" opacity={0}>
                <line x1={mx - 2.2} y1={y - 2.2} x2={mx + 2.2} y2={y + 2.2}
                  stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
                <line x1={mx + 2.2} y1={y - 2.2} x2={mx - 2.2} y2={y + 2.2}
                  stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
              </g>
            )}
            {showMarkerLabel && (
              <text x={mx} y={markerLabelY} textAnchor="middle"
                fontSize={7 * ts} fontWeight={600}
                fill={isExplicit || isBondEndpoint ? '#185FA5' : 'rgba(24, 95, 165, 0.5)'}>
                {val}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
