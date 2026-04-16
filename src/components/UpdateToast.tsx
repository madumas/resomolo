import { useEffect, useState } from 'react';
import { UI_PRIMARY, UI_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_BORDER } from '../config/theme';
import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';

export interface UpdateToastProps {
  /** Callback déclenché par "Mettre à jour" — recharge l'app avec la nouvelle version. */
  readonly onUpdate: () => void;
  /** Callback "Plus tard" — respecte la cooldown 24h gérée par le parent. */
  readonly onDismiss: () => void;
}

const AUTO_DISMISS_MS = 30_000;

/**
 * Toast non-bloquant "Nouvelle version disponible".
 * Placement : bottom-center au-dessus de la safe-area iPhone.
 * Respecte `prefers-reduced-motion` (pas d'animation de slide).
 */
export function UpdateToast({ onUpdate, onDismiss }: UpdateToastProps) {
  const [visible, setVisible] = useState(false);

  // Fade-in après mount (ne pas pousser visuellement pendant le render)
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Auto-dismiss après 30s — évite le harcèlement visuel durant une activité
  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        transform: 'translateX(-50%)',
        zIndex: 500,
        maxWidth: 420,
        width: 'calc(100% - 24px)',
        background: UI_SURFACE,
        border: `1px solid ${UI_BORDER}`,
        borderRadius: 12,
        padding: '14px 16px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease-out',
      }}
      data-testid="update-toast"
    >
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [data-testid="update-toast"] { transition: none !important; opacity: 1 !important; }
        }
      `}</style>
      <div style={{ fontSize: 14, color: UI_TEXT_PRIMARY, fontWeight: 600 }}>
        Une nouvelle version est prête.
      </div>
      <div style={{ fontSize: 13, color: UI_TEXT_SECONDARY }}>
        Veux-tu la mettre à jour?
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          onClick={onDismiss}
          style={{
            minHeight: MIN_BUTTON_SIZE_PX,
            padding: '0 14px',
            background: 'transparent',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 8,
            fontSize: 13,
            color: UI_TEXT_SECONDARY,
            cursor: 'pointer',
          }}
          data-testid="update-toast-dismiss"
        >
          Plus tard
        </button>
        <button
          onClick={onUpdate}
          style={{
            minHeight: MIN_BUTTON_SIZE_PX,
            padding: '0 16px',
            background: UI_PRIMARY,
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            color: '#FFFFFF',
            cursor: 'pointer',
            fontWeight: 600,
          }}
          data-testid="update-toast-update"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}
