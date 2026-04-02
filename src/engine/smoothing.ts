/**
 * Exponential Moving Average (EMA) cursor smoothing filter.
 * Smooths pointer movement during piece dragging for better precision.
 * Alpha=0.3: 30% new + 70% previous = moderate smoothing.
 */

const DEFAULT_ALPHA = 0.3;

export interface SmoothingState {
  x: number;
  y: number;
  initialized: boolean;
}

export function createSmoothingState(): SmoothingState {
  return { x: 0, y: 0, initialized: false };
}

export function smooth(
  state: SmoothingState,
  rawX: number,
  rawY: number,
  alpha: number = DEFAULT_ALPHA,
): { x: number; y: number; state: SmoothingState } {
  if (!state.initialized) {
    const newState: SmoothingState = { x: rawX, y: rawY, initialized: true };
    return { x: rawX, y: rawY, state: newState };
  }
  const x = state.x + alpha * (rawX - state.x);
  const y = state.y + alpha * (rawY - state.y);
  const newState: SmoothingState = { x, y, initialized: true };
  return { x, y, state: newState };
}
