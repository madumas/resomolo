import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';
import { STATUS_BAR_HEIGHT, STATUS_BAR_BG, UI_PRIMARY, UI_BORDER, UI_TEXT_SECONDARY } from '../config/theme';

interface StatusBarProps {
  message: string;
  variant?: 'default' | 'relance';
  cancelLabel?: string;
  onCancel?: () => void;
  showJetonQuantity?: boolean;
  jetonQuantity?: number;
  onJetonQuantityChange?: (n: number) => void;
  showTutorialButtons?: boolean;
  onTutorialNext?: () => void;
  onTutorialSkip?: () => void;
  problemCollapsed?: boolean;
  problemText?: string;
  onExpandProblem?: () => void;
}

function extractQuestion(text: string): string {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const question = [...sentences].reverse().find(s => s.includes('?'));
  return question || sentences[sentences.length - 1] || text;
}

export function StatusBar({
  message,
  variant = 'default',
  cancelLabel,
  onCancel,
  showJetonQuantity,
  jetonQuantity = 1,
  onJetonQuantityChange,
  showTutorialButtons,
  onTutorialNext,
  onTutorialSkip,
  problemCollapsed,
  problemText,
  onExpandProblem,
}: StatusBarProps) {
  // When problem zone is collapsed and there's a problem, show the question
  const showProblemReminder = problemCollapsed && problemText && problemText.length > 0;
  const questionText = showProblemReminder ? extractQuestion(problemText) : '';

  return (
    <div data-testid="status-bar" role="status" aria-live="polite" style={{
      padding: '6px 16px',
      background: variant === 'relance' ? '#F5F0FA' : STATUS_BAR_BG,
      borderBottom: `1px solid ${UI_BORDER}`,
      borderLeft: `3px solid ${variant === 'relance' ? '#9060C0' : UI_PRIMARY}`,
      fontSize: 13,
      color: variant === 'relance' ? '#7545A5' : UI_PRIMARY,
      flexShrink: 0,
      height: STATUS_BAR_HEIGHT,
      display: 'flex',
      position: 'relative',
      zIndex: 0, // below context actions (z-index: 10) which escape via Canvas z-index: 1
      alignItems: 'center',
      gap: 12,
    }}>
      {showProblemReminder ? (
        <span
          onClick={onExpandProblem}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') onExpandProblem?.(); }}
          style={{
            flex: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: MIN_BUTTON_SIZE_PX,
          }}
          title="Cliquer pour voir le problème"
        >
          <span style={{ fontSize: 10, color: UI_TEXT_SECONDARY }}>▶</span>
          <span style={{
            color: '#4E5560',
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {questionText}
          </span>
        </span>
      ) : (
        <StatusMessage message={message} variant={variant} />
      )}
      {onCancel && (
        <button
          onClick={onCancel}
          style={{
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
            background: '#fff',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 4,
            color: UI_TEXT_SECONDARY,
            cursor: 'pointer',
            minHeight: MIN_BUTTON_SIZE_PX,
            whiteSpace: 'nowrap',
          }}
        >
          {cancelLabel || '✕ Annuler'}
        </button>
      )}
      {showJetonQuantity && onJetonQuantityChange && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[1, 3, 5, 10].map(n => (
            <button
              key={n}
              onClick={() => onJetonQuantityChange(n)}
              onPointerDown={e => e.stopPropagation()}
              aria-label={`Quantité: ${n}`}
              style={{
                minWidth: MIN_BUTTON_SIZE_PX,
                height: MIN_BUTTON_SIZE_PX,
                border: `1px solid ${jetonQuantity === n ? UI_PRIMARY : UI_BORDER}`,
                borderRadius: 4,
                background: jetonQuantity === n ? '#EDE0FA' : '#fff',
                color: jetonQuantity === n ? UI_PRIMARY : UI_TEXT_SECONDARY,
                fontSize: 13,
                fontWeight: jetonQuantity === n ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
        </span>
      )}
      {showTutorialButtons && (
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onTutorialNext}
            style={{
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 600,
              background: UI_PRIMARY,
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              minHeight: MIN_BUTTON_SIZE_PX,
            }}
          >
            Suivant →
          </button>
          <button
            onClick={onTutorialSkip}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              background: 'none',
              color: UI_TEXT_SECONDARY,
              border: '1px solid #D5D0E0',
              borderRadius: 4,
              cursor: 'pointer',
              minHeight: MIN_BUTTON_SIZE_PX,
            }}
          >
            Passer
          </button>
        </span>
      )}
    </div>
  );
}

function StatusMessage({ message, variant }: { message: string; variant: 'default' | 'relance' }) {
  const sep = message.indexOf(' — ');
  if (sep === -1) {
    return <span style={{ flex: 1 }}>{message}</span>;
  }
  const badge = message.slice(0, sep);
  const instruction = message.slice(sep + 3);
  const badgeColor = variant === 'relance' ? '#7545A5' : UI_PRIMARY;
  return (
    <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        background: badgeColor,
        color: '#fff',
        padding: '1px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {badge}
      </span>
      <span style={{ color: variant === 'relance' ? '#7545A5' : '#4E5560' }}>
        {instruction}
      </span>
    </span>
  );
}
