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

// Snap — bar aligned (subtle click in reduced, sweep in full)
export function soundSnapReduced() {
  play(250, 20, 'triangle', 0.10);
}
export function soundSnapFull() {
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 480;
    osc.frequency.linearRampToValueAtTime(320, c.currentTime + 0.035);
    g.gain.value = 0.15 * gainMultiplier;
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.035);
    osc.connect(g);
    g.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.035);
  } catch {
    // Audio not available — silent fallback
  }
}
// Keep legacy export for backward compat
export const soundSnap = soundSnapReduced;

// Delete — neutral, not punitive (short descending, soft)
export function soundDelete() {
  play(440, 60, 'sine', 0.1);
  setTimeout(() => play(330, 50, 'sine', 0.06), 40);
}

// Undo — very neutral (quiet ascending blip)
export function soundUndo() {
  play(400, 35, 'sine', 0.06);
}

// Attach — étiquette→pièce or flèche→pièce (ascending triangle)
export function soundAttach() {
  play(550, 40, 'triangle', 0.08);
  setTimeout(() => play(700, 30, 'triangle', 0.06), 20);
}

// Subdivide — bar divided into parts (V shape: high→low→high)
export function soundSubdivide() {
  play(800, 25, 'sine', 0.08);
  setTimeout(() => play(600, 25, 'sine', 0.06), 25);
  setTimeout(() => play(800, 20, 'sine', 0.05), 50);
}

// Acknowledge — response written (flat, very soft, NOT evaluative)
export function soundAcknowledge() {
  play(500, 25, 'sine', 0.04);
}

// Ghost snap — cursor snaps to a target/graduation during preview (very subtle tick)
export function soundGhostSnap() {
  play(350, 15, 'triangle', 0.05);
}

// Distribute — jetons distributed into groups (3 micropulses)
export function soundDistribute() {
  play(600, 20, 'sine', 0.06);
  setTimeout(() => play(600, 20, 'sine', 0.05), 22);
  setTimeout(() => play(600, 20, 'sine', 0.04), 44);
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

let _lastSnapTime = 0;
export function onSnap() {
  const now = Date.now();
  if (now - _lastSnapTime < 150) return;       // debounce 150ms
  _lastSnapTime = now;
  if (mode === 'reduced') { soundSnapReduced(); }
  else if (mode === 'full') { soundSnapFull(); haptic(15); }
}

export function onDelete() {
  if (mode !== 'off') { soundDelete(); haptic(20); }
}

export function onUndoSound() {
  if (mode === 'full') { soundUndo(); }
}

export function onAttach() {
  if (mode === 'full') { soundAttach(); haptic(20); }
}

export function onSubdivide() {
  if (mode === 'full') { soundSubdivide(); haptic(15); setTimeout(() => haptic(15), 35); }
}

export function onAcknowledge() {
  if (mode === 'full') { soundAcknowledge(); }
}

export function onDistribute() {
  if (mode === 'full') { soundDistribute(); }
}

// Arbre: add node — brief ascending pop (R10)
export function soundAddNode() {
  play(600, 30, 'sine', 0.06);
}

// Schema: change gabarit — smooth transition (R10)
export function soundChangeGabarit() {
  play(400, 40, 'triangle', 0.04);
  setTimeout(() => play(500, 30, 'triangle', 0.04), 50);
}

// Schema: add part/subdivision (R10)
export function soundAddPart() {
  play(550, 20, 'sine', 0.05);
}

export function onAddNode() {
  if (mode !== 'off') { soundAddNode(); haptic(20); }
}

export function onChangeGabarit() {
  if (mode !== 'off') { soundChangeGabarit(); }
}

export function onAddPart() {
  if (mode === 'full') { soundAddPart(); haptic(15); }
}

let _lastGhostSnapTime = 0;
export function onGhostSnap() {
  const now = Date.now();
  if (now - _lastGhostSnapTime < 100) return;  // debounce 100ms
  _lastGhostSnapTime = now;
  if (mode === 'full') { soundGhostSnap(); }
}
