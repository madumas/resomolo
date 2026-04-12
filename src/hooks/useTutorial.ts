import { useState, useCallback, useEffect } from 'react';
import type { ModelisationState } from '../model/types';

export type TutorialStep =
  | 'problem1_intro'
  | 'problem1_highlight'
  | 'problem1_place_tokens'
  | 'problem1_calc'
  | 'problem1_answer'
  | 'transition'
  | 'problem2_intro'
  | 'problem2_place_bar'
  | 'problem2_resize'
  | 'problem2_calc'
  | 'problem2_answer'
  | 'done'
  | null;

const TUTORIAL_PROBLEM_1 = 'Théo a 5 pommes. Il en donne 2 à Léa. Combien lui en reste-t-il?';
const TUTORIAL_PROBLEM_2 = 'Il y a 3 tables. Chaque table a 4 crayons. Combien y a-t-il de crayons en tout?';

// Estompage progressif : directif pour les 1res pièces, ouvert une fois le répertoire acquis.
export const STEP_MESSAGES: Record<Exclude<TutorialStep, null>, string> = {
  problem1_intro: 'Tutoriel — Commence par lire le problème ci-dessus.',
  problem1_highlight: 'Quels sont les nombres importants dans ce problème? Clique dessus pour les surligner.',
  problem1_place_tokens: 'Clique sur Jeton dans la barre d\'outils, puis clique dans le canvas pour placer des jetons.',
  problem1_calc: 'Quel calcul faut-il faire? Clique sur Calcul pour l\'écrire.',
  problem1_answer: 'Quelle est ta réponse? Clique sur Réponse pour l\'écrire.',
  transition: 'Passons au deuxième problème...',
  problem2_intro: 'Clique sur Barre dans la barre d\'outils pour placer une barre.',
  problem2_place_bar: 'Il y a 3 tables identiques. Comment montrer ça dans ton modèle?',
  problem2_resize: 'Quel calcul faut-il faire? Clique sur Calcul pour l\'écrire.',
  problem2_calc: 'Quelle est ta réponse? Clique sur Réponse pour l\'écrire.',
  problem2_answer: 'Tu connais les pièces! Clique Suivant pour commencer.',
  done: '',
};

// Steps where the "Suivant" button is shown (manual advancement)
const SHOW_NEXT: Set<TutorialStep> = new Set([
  'problem1_intro',
  'problem1_highlight',
  'problem1_place_tokens',
  'problem1_calc',
  'problem1_answer',
  'problem2_intro',
  'problem2_place_bar',
  'problem2_resize',
  'problem2_calc',
  'problem2_answer',
]);

const STEP_ORDER: Exclude<TutorialStep, null>[] = [
  'problem1_intro',
  'problem1_highlight',
  'problem1_place_tokens',
  'problem1_calc',
  'problem1_answer',
  'transition',
  'problem2_intro',
  'problem2_place_bar',
  'problem2_resize',
  'problem2_calc',
  'problem2_answer',
  'done',
];

// R8: State-shape detection predicates per step.
// When the predicate returns true, the tutorial auto-advances after a short delay.
export const STEP_DETECTORS: Partial<Record<NonNullable<TutorialStep>, (s: ModelisationState) => boolean>> = {
  // problem1_intro: pas de detector — avancement manuel seulement
  problem1_highlight: s => s.problemeHighlights.length > 0,
  problem1_place_tokens: s => s.pieces.some(p => p.type === 'jeton'),
  problem1_calc: s => s.pieces.some(p => p.type === 'calcul'),
  problem1_answer: s => s.pieces.some(p => p.type === 'reponse'),
  problem2_intro: s => s.pieces.some(p => p.type === 'barre'),
  problem2_place_bar: s => s.pieces.filter(p => p.type !== 'calcul' && p.type !== 'reponse').length >= 3,
  problem2_resize: s => s.pieces.some(p => p.type === 'calcul'),
  problem2_calc: s => s.pieces.some(p => p.type === 'reponse'),
  problem2_answer: s => s.pieces.some(p => p.type === 'reponse' && 'text' in p && (p.text as string).length > 0),
};

export function useTutorial(state: ModelisationState) {
  const [step, setStep] = useState<TutorialStep>(null);
  const [tutorialProblemIndex, setTutorialProblemIndex] = useState(0);

  // Manual advancement — the user/adult clicks "Suivant"
  const nextStep = useCallback(() => {
    if (!step || step === 'done') return;
    const currentIdx = STEP_ORDER.indexOf(step);
    if (currentIdx < 0 || currentIdx >= STEP_ORDER.length - 1) {
      setStep('done');
      return;
    }
    const next = STEP_ORDER[currentIdx + 1];
    // Handle transition between problems
    if (next === 'transition') {
      setTutorialProblemIndex(1);
      setStep('problem2_intro');
    } else {
      setStep(next);
    }
  }, [step]);

  // R8: Auto-advance when the detection predicate is satisfied.
  // Uses setStep(prev => ...) to guard against race with manual "Suivant" (C4 fix).
  useEffect(() => {
    if (!step || step === 'done') return;
    const detector = STEP_DETECTORS[step];
    if (!detector || !detector(state)) return;

    const currentStep = step;
    const timer = setTimeout(() => {
      setStep(prev => {
        if (prev !== currentStep) return prev; // already advanced manually
        const idx = STEP_ORDER.indexOf(currentStep);
        if (idx < 0 || idx >= STEP_ORDER.length - 1) return 'done';
        const next = STEP_ORDER[idx + 1];
        if (next === 'transition') {
          setTutorialProblemIndex(1);
          return 'problem2_intro';
        }
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [step, state.pieces, state.problemeHighlights]);

  const startTutorial = useCallback(() => {
    setStep('problem1_intro');
    setTutorialProblemIndex(0);
  }, []);

  const skipTutorial = useCallback(() => {
    setStep('done');
  }, []);

  const isActive = step !== null && step !== 'done';
  const message = step ? STEP_MESSAGES[step] : '';
  const currentProblem = tutorialProblemIndex === 0 ? TUTORIAL_PROBLEM_1 : TUTORIAL_PROBLEM_2;
  const showNextButton = step !== null && SHOW_NEXT.has(step);

  return {
    isActive,
    isDone: step === 'done',
    step,
    message,
    currentProblem,
    tutorialProblemIndex,
    showNextButton,
    startTutorial,
    skipTutorial,
    nextStep,
  };
}
