import { useRef, useEffect, useState } from 'react';
import type { DroiteNumerique } from '../../model/types';
import { computeAllBondLevels, computeBondPath, getImplicitMarkers, isMarkerCoveredByPositiveBond } from '../../engine/bonds';

export function DroiteNumeriquePiece({ piece, isSelected, textScale = 1, selectedBondIndex, bondMode, bondFromVal, toleranceMultiplier = 1 }: {
  piece: DroiteNumerique;
  isSelected: boolean;
  textScale?: number;
  selectedBondIndex?: number;
  bondMode?: boolean;
  bondFromVal?: number | null;
  toleranceMultiplier?: number;
}) {
  const ts = textScale;
  const { x, y, min, max, step, markers, width } = piece;
  const bonds = piece.bonds ?? [];

  // Track bond count for animation
  const prevBondCount = useRef(bonds.length);
  const lastBondTime = useRef(0);
  const [newBondIndex, setNewBondIndex] = useState<number | null>(null);

  useEffect(() => {
    if (bonds.length > prevBondCount.current) {
      const now = Date.now();
      const elapsed = now - lastBondTime.current;
      if (elapsed > 200) {
        // Not rapid chaining — animate the new bond
        setNewBondIndex(bonds.length - 1);
        const timer = setTimeout(() => setNewBondIndex(null), 350); // animation duration + buffer
        lastBondTime.current = now;
        prevBondCount.current = bonds.length;
        return () => clearTimeout(timer);
      }
      lastBondTime.current = now;
    }
    prevBondCount.current = bonds.length;
  }, [bonds.length]);

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
            {/* Label background */}
            {bond.label && (
              <rect
                x={info.midX - (bond.label.length * 2.5 * ts + 2)}
                y={labelY - 4.5 * ts}
                width={bond.label.length * 5 * ts + 4}
                height={8 * ts}
                rx={2}
                fill="rgba(255,255,255,0.85)"
                pointerEvents="none"
                className={isNew ? 'bond-label-new' : undefined} />
            )}
            {/* Label text */}
            {bond.label && (
              <text x={info.midX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={7 * ts}
                fontWeight={600}
                fill={isSel ? '#7028E0' : '#185FA5'}
                pointerEvents="none"
                className={isNew ? 'bond-label-new' : undefined}>
                {bond.label}
              </text>
            )}
          </g>
        );
      })}

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

      {/* Markers (child-placed dots + implicit bond endpoints) */}
      {allMarkerVals.map((val, i) => {
        const mx = x + ((val - min) / (max - min)) * width;
        const isExplicit = markers.includes(val);
        const isBondFrom = bondFromVal !== null && bondFromVal !== undefined && Math.abs(val - bondFromVal) < 1e-9;
        const labelBelow = isMarkerCoveredByPositiveBond(val, bonds);
        const markerLabelY = labelBelow ? y + 9 + 7 * ts : y - 7;
        const isBondEndpointSel = selectedBondIndex !== undefined && selectedBondIndex >= 0 &&
          bonds[selectedBondIndex] && (
            Math.abs(val - bonds[selectedBondIndex].from) < 1e-9 ||
            Math.abs(val - bonds[selectedBondIndex].to) < 1e-9
          );
        return (
          <g key={`m-${i}`}>
            <circle cx={mx} cy={y}
              r={isBondFrom ? 5.5 : isBondEndpointSel ? 5 : 4}
              fill={isExplicit || isBondFrom ? '#185FA5' : 'rgba(24, 95, 165, 0.4)'}
              stroke="#fff" strokeWidth={0.7}
              style={isBondFrom ? { animation: 'marker-pulse 1.5s ease-in-out infinite' } : undefined} />
            <text x={mx} y={markerLabelY} textAnchor="middle"
              fontSize={7 * ts} fontWeight={600}
              fill={isExplicit ? '#185FA5' : 'rgba(24, 95, 165, 0.5)'}>
              {val}
            </text>
          </g>
        );
      })}
    </g>
  );
}
