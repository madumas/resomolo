import { describe, test, expect } from 'vitest';
import {
  setSoundMode,
  getSoundMode,
  setGainMultiplier,
  onPlace,
  onSnap,
  onDelete,
  onUndoSound,
  onAttach,
  onSubdivide,
  onAcknowledge,
  onDistribute,
} from '../sound';

describe('sound mode logic', () => {
  test('setSoundMode changes mode', () => {
    setSoundMode('off');
    expect(getSoundMode()).toBe('off');
    setSoundMode('full');
    expect(getSoundMode()).toBe('full');
    setSoundMode('reduced');
    expect(getSoundMode()).toBe('reduced');
  });

  test('setGainMultiplier clamps to 0-1', () => {
    // These should not throw; the value is clamped internally
    setGainMultiplier(-0.5);
    setGainMultiplier(2.0);
    setGainMultiplier(0.5); // reset to sane default
  });

  test('dispatchers do not throw without AudioContext', () => {
    setSoundMode('full');
    expect(() => onPlace()).not.toThrow();
    expect(() => onSnap()).not.toThrow();
    expect(() => onDelete()).not.toThrow();
    expect(() => onUndoSound()).not.toThrow();
    expect(() => onAttach()).not.toThrow();
    expect(() => onSubdivide()).not.toThrow();
    expect(() => onAcknowledge()).not.toThrow();
    expect(() => onDistribute()).not.toThrow();
  });

  test('dispatchers do not throw in off mode', () => {
    setSoundMode('off');
    expect(() => onPlace()).not.toThrow();
    expect(() => onSnap()).not.toThrow();
    expect(() => onDelete()).not.toThrow();
    expect(() => onUndoSound()).not.toThrow();
    expect(() => onAttach()).not.toThrow();
    expect(() => onSubdivide()).not.toThrow();
    expect(() => onAcknowledge()).not.toThrow();
    expect(() => onDistribute()).not.toThrow();
  });

  test('dispatchers do not throw in reduced mode', () => {
    setSoundMode('reduced');
    expect(() => onPlace()).not.toThrow();
    expect(() => onSnap()).not.toThrow();
    expect(() => onDelete()).not.toThrow();
    expect(() => onUndoSound()).not.toThrow();
    expect(() => onAttach()).not.toThrow();
    expect(() => onSubdivide()).not.toThrow();
    expect(() => onAcknowledge()).not.toThrow();
    expect(() => onDistribute()).not.toThrow();
  });

  // Reset mode after tests
  test('cleanup: reset to reduced', () => {
    setSoundMode('reduced');
    setGainMultiplier(0.5);
    expect(getSoundMode()).toBe('reduced');
  });
});
