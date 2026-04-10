/**
 * Shared chart layout utilities for DiagrammeBandes and DiagrammeLigne.
 * All dimensions in mm (same coordinate system as the canvas).
 */

export interface ChartDimensions {
  width: number;
  height: number;
  paddingLeft: number;   // space for Y-axis labels
  paddingBottom: number; // space for X-axis labels
  paddingTop: number;    // space for title
  paddingRight: number;  // right margin
}

export const DEFAULT_CHART_DIMS: ChartDimensions = {
  width: 120,
  height: 90,
  paddingLeft: 15,
  paddingBottom: 12,
  paddingTop: 6,
  paddingRight: 4,
};

export interface AxisConfig {
  min: number;
  max: number;
  step: number;
}

/**
 * Compute a "nice" axis scale for an array of values.
 * Returns min (always 0 for bar/line charts), a rounded max, and a readable step.
 */
export function computeAutoScale(values: number[]): AxisConfig {
  if (values.length === 0) return { min: 0, max: 10, step: 2 };
  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);
  if (maxVal === 0 && minVal === 0) return { min: 0, max: 10, step: 2 };
  const niceMax = maxVal > 0 ? niceNumber(maxVal * 1.15, true) : 0;
  const niceMin = minVal < 0 ? -niceNumber(Math.abs(minVal) * 1.15, true) : 0;
  const range = niceMax - niceMin;
  const step = niceNumber(range / 5, false);
  return { min: niceMin, max: Math.max(niceMax, niceMin + step), step: Math.max(step, 1) };
}

/**
 * Round a number up (ceiling) or to nearest "nice" number for axis labels.
 * Nice numbers are 1, 2, 5, 10, 20, 50, 100, etc.
 */
export function niceNumber(val: number, ceiling = true): number {
  if (val <= 0) return 1;
  const exp = Math.floor(Math.log10(val));
  const frac = val / Math.pow(10, exp);
  let nice: number;
  if (ceiling) {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1.5) nice = 1;
    else if (frac <= 3) nice = 2;
    else if (frac <= 7) nice = 5;
    else nice = 10;
  }
  return nice * Math.pow(10, exp);
}

export interface PlotArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get the drawable plot area inside the chart (excluding axis labels and padding).
 */
export function getPlotArea(dims: ChartDimensions): PlotArea {
  return {
    x: dims.paddingLeft,
    y: dims.paddingTop,
    width: dims.width - dims.paddingLeft - dims.paddingRight,
    height: dims.height - dims.paddingTop - dims.paddingBottom,
  };
}
