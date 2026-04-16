import { useEffect, useRef, useState } from 'react';
import { UI_PRIMARY, UI_CAUTION, UI_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_BORDER } from '../config/theme';
import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';
import { useModalBehavior } from '../hooks/useModalBehavior';

export interface ConfirmDialogProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  /** 'default' = confirm primary violet, 'attention' = orange ambré pour actions destructives. */
  readonly variant?: 'default' | 'attention';
}

const ANTI_DOUBLE_TAP_MS = 300;

export function ConfirmDialog({
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(dialogRef, onCancel, { initialFocusRef: cancelRef });

  // Anti-double-tap : le bouton Confirm est désactivé 300 ms après l'apparition
  // pour éviter les clics rebonds / double-taps accidentels (impulsivité, TDAH).
  const [confirmArmed, setConfirmArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setConfirmArmed(true), ANTI_DOUBLE_TAP_MS);
    return () => clearTimeout(t);
  }, []);

  const confirmBg = variant === 'attention' ? UI_CAUTION : UI_PRIMARY;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onCancel}
      data-testid="confirm-dialog-overlay"
    >
      <div
        style={{
          background: UI_SURFACE,
          borderRadius: 12,
          padding: '24px 28px',
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="confirm-dialog"
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: UI_TEXT_PRIMARY, margin: 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 13, color: UI_TEXT_SECONDARY, margin: '8px 0 0' }}>{subtitle}</p>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            style={{
              height: MIN_BUTTON_SIZE_PX,
              padding: '0 16px',
              border: `1px solid ${UI_BORDER}`,
              borderRadius: 4,
              background: 'transparent',
              color: UI_TEXT_SECONDARY,
              cursor: 'pointer',
              fontSize: 13,
            }}
            data-testid="confirm-dialog-cancel"
          >
            {cancelLabel}
          </button>

          <button
            onClick={confirmArmed ? onConfirm : undefined}
            disabled={!confirmArmed}
            aria-disabled={!confirmArmed}
            style={{
              height: MIN_BUTTON_SIZE_PX,
              padding: '0 20px',
              border: 'none',
              borderRadius: 4,
              background: confirmBg,
              color: '#FFFFFF',
              cursor: confirmArmed ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
              opacity: confirmArmed ? 1 : 0.6,
              pointerEvents: confirmArmed ? 'auto' : 'none',
            }}
            data-testid="confirm-dialog-confirm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
