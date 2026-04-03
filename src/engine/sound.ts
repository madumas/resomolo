/**
 * Sound engine — Web Audio API, synthesized, no audio files.
 * Same approach as GéoMolo.
 *
 * 3 modes: 'off' | 'reduced' | 'full'
 * Reduced (default): placement + suppression only
 * Full: all sounds
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function play(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15) {
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain * gainMultiplier;
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration / 1000);
    osc.connect(g);
    g.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration / 1000);
  } catch {
    // Audio not available — silent fallback
  }
}

// Pop — piece placed (bright, short, positive)
export function soundPlace() {
  play(660, 50, 'sine', 0.12);
  setTimeout(() => play(880, 40, 'sine', 0.08), 30);
}

// Snap — bar aligned (subtle click)
export function soundSnap() {
  play(1200, 25, 'square', 0.05);
}

// Delete — neutral, not punitive (short descending, soft)
export function soundDelete() {
  play(440, 60, 'sine', 0.1);
  setTimeout(() => play(330, 50, 'sine', 0.06), 40);
}

// Undo — very neutral (quiet ascending blip)
export function soundUndo() {
  play(400, 35, 'sine', 0.06);
}

// Haptic — vibration on supported devices
export function haptic(ms = 30) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported — silent
  }
}

// Sound mode & gain
export type { SoundMode } from '../model/types';

let mode: import('../model/types').SoundMode = 'reduced';
let gainMultiplier = 0.5;

export function setSoundMode(m: import('../model/types').SoundMode) {
  mode = m;
}

export function getSoundMode(): import('../model/types').SoundMode {
  return mode;
}

export function setGainMultiplier(g: number) {
  gainMultiplier = Math.max(0, Math.min(1, g));
}

// Dispatchers — check mode before playing
export function onPlace() {
  if (mode !== 'off') { soundPlace(); haptic(); }
}

export function onSnap() {
  if (mode === 'full') { soundSnap(); haptic(15); }
}

export function onDelete() {
  if (mode !== 'off') { soundDelete(); haptic(20); }
}

export function onUndoSound() {
  if (mode === 'full') { soundUndo(); }
}
