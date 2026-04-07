import { SNAP_GRID_MM } from '../model/types';

/**
 * Convert a pointer event (client coordinates) to mm in the SVG model space.
 */
export function pointerToMm(
  e: { clientX: number; clientY: number },
  svgElement: SVGSVGElement
): { x: number; y: number } {
  const ctm = svgElement.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const inverse = ctm.inverse();
  const pt = new DOMPoint(e.clientX, e.clientY);
  const svgPt = pt.matrixTransform(inverse);
  return { x: svgPt.x, y: svgPt.y };
}

/**
 * Snap a position to the invisible grid.
 */
export function snapToGrid(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(x / SNAP_GRID_MM) * SNAP_GRID_MM,
    y: Math.round(y / SNAP_GRID_MM) * SNAP_GRID_MM,
  };
}

/**
 * Calculate the viewBox height in mm to maintain aspect ratio.
 */
export function calculateViewBoxHeight(widthMm: number, containerWidth: number, containerHeight: number): number {
  if (containerWidth === 0) return 350;
  return widthMm * (containerHeight / containerWidth);
}
