import { useState, useCallback, useMemo } from 'react';
import type { WorkedExample } from '../config/worked-examples';
import type { Piece } from '../model/types';
import { computeArrangement } from '../engine/arrange';

export type ExamplePhase = 'enonce' | 'modelisation' | 'calcul' | 'complet';

const PHASE_ORDER: ExamplePhase[] = ['enonce', 'modelisation', 'calcul', 'complet'];

const PHASE_MESSAGES: Record<ExamplePhase, string> = {
  enonce: 'Observe le problème et les données surlignées.',
  modelisation: 'Observe comment le problème est représenté avec des pièces.',
  calcul: 'Observe le calcul choisi.',
  complet: '', // replaced by example.explanation at runtime
};

const CALCUL_TYPES = new Set(['calcul']);
const ANSWER_TYPES = new Set(['reponse']);

/** Auto-arrange pieces using the existing layout engine (unlock temporarily for computation). */
function autoArrange(pieces: Piece[], referenceUnitMm: number): Piece[] {
  // Temporarily unlock all pieces so computeArrangement will process them
  const unlocked = pieces.map(p => ({ ...p, locked: false }));
  const moves = computeArrangement(unlocked, referenceUnitMm);
  if (moves.length === 0) return pieces;
  const moveMap = new Map(moves.map(m => [m.id, m]));
  return pieces.map(p => {
    const move = moveMap.get(p.id);
    return move ? { ...p, x: move.x, y: move.y } : p;
  });
}

function filterPiecesForPhase(pieces: Piece[], phase: ExamplePhase): Piece[] {
  switch (phase) {
    case 'enonce':
      return []; // no pieces — only problem + highlights
    case 'modelisation':
      return pieces.filter(p => !CALCUL_TYPES.has(p.type) && !ANSWER_TYPES.has(p.type));
    case 'calcul':
      return pieces.filter(p => !ANSWER_TYPES.has(p.type));
    case 'complet':
      return pieces;
  }
}

export function useWorkedExample() {
  const [activeExample, setActiveExample] = useState<WorkedExample | null>(null);
  const [phase, setPhase] = useState<ExamplePhase>('enonce');

  const isExampleMode = activeExample !== null;

  const loadExample = useCallback((example: WorkedExample) => {
    setActiveExample(example);
    setPhase('enonce');
  }, []);

  const exitExample = useCallback(() => {
    setActiveExample(null);
    setPhase('enonce');
  }, []);

  const nextPhase = useCallback(() => {
    setPhase(prev => {
      const idx = PHASE_ORDER.indexOf(prev);
      if (idx < PHASE_ORDER.length - 1) return PHASE_ORDER[idx + 1];
      return prev;
    });
  }, []);

  const prevPhase = useCallback(() => {
    setPhase(prev => {
      const idx = PHASE_ORDER.indexOf(prev);
      if (idx > 0) return PHASE_ORDER[idx - 1];
      return prev;
    });
  }, []);

  const message = useMemo(() => {
    if (!activeExample) return '';
    if (phase === 'complet') return activeExample.explanation;
    return PHASE_MESSAGES[phase];
  }, [activeExample, phase]);

  // Auto-arrange all pieces once on load, then filter by phase
  const arrangedPieces = useMemo(() => {
    if (!activeExample) return [];
    return autoArrange(activeExample.state.pieces, activeExample.state.referenceUnitMm);
  }, [activeExample]);

  const visiblePieces = useMemo(() => {
    return filterPiecesForPhase(arrangedPieces, phase);
  }, [arrangedPieces, phase]);

  const showNextPhase = phase !== 'complet';
  const showPrevPhase = phase !== 'enonce';
  const showTryButton = phase === 'complet';
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const phaseCount = PHASE_ORDER.length;

  return {
    isExampleMode,
    activeExample,
    phase,
    message,
    visiblePieces,
    showNextPhase,
    showPrevPhase,
    showTryButton,
    phaseIndex,
    phaseCount,
    loadExample,
    exitExample,
    nextPhase,
    prevPhase,
  };
}
