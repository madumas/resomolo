import { useState, useEffect } from 'react';
import { UI_PRIMARY } from '../config/theme';

const STORAGE_KEY = 'resomolo-onboarding-done';

interface OnboardingStep {
  target: string;        // data-testid or CSS selector
  title: string;
  text: string;
}

const STEPS: OnboardingStep[] = [
  {
    target: '[data-testid="problem-zone"]',
    title: 'Le problème',
    text: 'Lis le problème ici. Touche les nombres et les mots clés pour les surligner.',
  },
  {
    target: '[data-testid="toolbar"], [data-testid="mobile-toolbar"]',
    title: 'Les outils',
    text: 'Choisis un outil pour modéliser : jetons, barres, schéma...',
  },
  {
    target: '[data-testid="canvas-container"]',
    title: 'Ton espace de travail',
    text: 'Place tes pièces ici pour résoudre le problème. Écris ta réponse quand tu es prêt.',
  },
];

interface OnboardingOverlayProps {
  onDone: () => void;
}

export function shouldShowOnboarding(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch { /* quota */ }
}

export function OnboardingOverlay({ onDone }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Find and measure target element — recalculate on resize/rotation
  useEffect(() => {
    const s = STEPS[step];
    if (!s) return;
    const measure = () => {
      const el = document.querySelector(s.target);
      setTargetRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);

  // Dismiss on any click/tap outside tooltip
  const handleBackdropClick = () => {
    markOnboardingDone();
    onDone();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      markOnboardingDone();
      onDone();
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    markOnboardingDone();
    onDone();
  };

  const current = STEPS[step];
  if (!current) return null;

  // Position tooltip below or above target
  const tooltipTop = targetRect
    ? targetRect.bottom + 12
    : window.innerHeight / 2;
  const tooltipLeft = targetRect
    ? Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 140, window.innerWidth - 296))
    : 16;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
      }}
    >
      {/* Spotlight cutout via box-shadow */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
            zIndex: 201,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: tooltipLeft,
          top: tooltipTop > window.innerHeight - 180 && targetRect
            ? targetRect.top - 140
            : tooltipTop,
          width: 280,
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          zIndex: 202,
        }}
      >
        <div style={{ fontSize: 11, color: UI_PRIMARY, fontWeight: 700, marginBottom: 4 }}>
          {step + 1} / {STEPS.length}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1E1A2E', marginBottom: 6 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 13, color: '#55506A', lineHeight: 1.4, marginBottom: 16 }}>
          {current.text}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              color: '#7A7490',
              fontSize: 13,
              cursor: 'pointer',
              padding: '6px 10px',
            }}
          >
            Passer
          </button>
          <button
            onClick={handleNext}
            style={{
              background: UI_PRIMARY,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            {step < STEPS.length - 1 ? 'Suivant' : 'C\'est parti!'}
          </button>
        </div>
      </div>
    </div>
  );
}
