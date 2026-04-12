import { useRef } from 'react';
import { WORKED_EXAMPLES, type WorkedExample, type CategoryGroup } from '../config/worked-examples';
import { UI_PRIMARY, UI_BG, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_BORDER } from '../config/theme';
import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface ExampleSelectorProps {
  onSelect: (example: WorkedExample) => void;
  onClose: () => void;
}

const GROUP_LABELS: Record<CategoryGroup, string> = {
  additif: 'Additif',
  multiplicatif: 'Multiplicatif',
  fractions: 'Fractions',
  'stats-proba': 'Stats / Proba',
  complexe: 'Multi-étapes',
};

const GROUP_ORDER: CategoryGroup[] = ['additif', 'multiplicatif', 'fractions', 'stats-proba', 'complexe'];

export function ExampleSelector({ onSelect, onClose }: ExampleSelectorProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(dialogRef, onClose);

  // Group examples by categoryGroup
  const grouped = GROUP_ORDER.map(group => ({
    group,
    label: GROUP_LABELS[group],
    examples: WORKED_EXAMPLES.filter(ex => ex.categoryGroup === group),
  })).filter(g => g.examples.length > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Exemples résolus"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: '1px solid #E8E5F0',
          maxWidth: 440,
          width: '90%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: UI_PRIMARY, marginBottom: 6, flexShrink: 0 }}>
          Exemples résolus
        </h2>
        <p style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginBottom: 16, flexShrink: 0 }}>
          Observe comment un problème est modélisé, puis essaie un problème similaire.
        </p>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {grouped.map(({ group, label, examples }) => (
              <div key={group}>
                <div style={{ fontSize: 11, fontWeight: 700, color: UI_TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  {label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {examples.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => onSelect(ex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        background: UI_BG,
                        border: '1px solid #E8E5F0',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        minHeight: MIN_BUTTON_SIZE_PX,
                        width: '100%',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14, color: UI_TEXT_PRIMARY, flex: 1 }}>
                        {ex.title}
                      </span>
                      <span style={{
                        fontSize: 11,
                        color: UI_TEXT_SECONDARY,
                        background: '#fff',
                        border: `1px solid ${UI_BORDER}`,
                        borderRadius: 4,
                        padding: '2px 6px',
                        whiteSpace: 'nowrap',
                      }}>
                        C{ex.cycle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '12px',
            background: UI_PRIMARY,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
