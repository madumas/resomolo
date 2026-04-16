import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';
import { STATUS_BAR_HEIGHT, STATUS_BAR_BG, UI_PRIMARY, UI_BORDER, UI_TEXT_SECONDARY } from '../config/theme';

interface StatusBarProps {
  message: string;
  variant?: 'default' | 'relance';
  isMobilePortrait?: boolean;
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
  fatigueNudge?: boolean;
  fatigueType?: 'rapid-clicks' | 'consecutive-undos' | null;
  onDismissFatigueNudge?: () => void;
  // Worked example mode
  exampleMode?: boolean;
  examplePhaseIndex?: number;
  examplePhaseCount?: number;
  onExampleNext?: () => void;
  onExamplePrev?: () => void;
  onExampleTry?: () => void;
  onExampleExit?: () => void;
  showExampleTry?: boolean;
}

function extractQuestion(text: string): string {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const question = [...sentences].reverse().find(s => s.includes('?'));
  return question || sentences[sentences.length - 1] || text;
}

export function StatusBar({
  message,
  variant = 'default',
  isMobilePortrait = false,
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
  fatigueNudge,
  fatigueType,
  onDismissFatigueNudge,
  exampleMode,
  examplePhaseIndex = 0,
  examplePhaseCount = 4,
  onExampleNext,
  onExamplePrev,
  onExampleTry,
  onExampleExit,
  showExampleTry,
}: StatusBarProps) {
  // When problem zone is collapsed and there's a problem, show the question
  const showProblemReminder = problemCollapsed && problemText && problemText.length > 0;
  const questionText = showProblemReminder ? extractQuestion(problemText) : '';

  return (
    // role="toolbar" + aria-label pour le conteneur ; aria-live est déplacé sur le seul
    // span StatusMessage (voir ligne ~302) pour éviter les re-lectures NVDA de tous les
    // boutons internes (jetons 1/3/5/10, tutoriel, etc.) à chaque re-render.
    <div data-testid="status-bar" role="toolbar" aria-label="Barre de statut" style={{
      padding: '6px 16px',
      background: variant === 'relance' ? '#F5F0FA' : STATUS_BAR_BG,
      borderBottom: `1px solid ${UI_BORDER}`,
      borderLeft: `3px solid ${variant === 'relance' ? '#9060C0' : UI_PRIMARY}`,
      fontSize: 13,
      color: variant === 'relance' ? '#7545A5' : UI_PRIMARY,
      flexShrink: 0,
      height: isMobilePortrait ? 'auto' : STATUS_BAR_HEIGHT,
      minHeight: isMobilePortrait ? 32 : STATUS_BAR_HEIGHT,
      display: 'flex',
      flexWrap: isMobilePortrait ? 'wrap' : 'nowrap',
      position: 'relative',
      zIndex: 0, // below context actions (z-index: 10) which escape via Canvas z-index: 1
      alignItems: 'center',
      gap: isMobilePortrait ? 6 : 12,
    }}>
      {fatigueNudge ? (
        <span
          onClick={onDismissFatigueNudge}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') onDismissFatigueNudge?.(); }}
          style={{
            flex: 1,
            cursor: 'pointer',
            color: '#9060C0',
            fontStyle: 'italic',
          }}
          title={isMobilePortrait ? 'Toucher pour fermer' : 'Cliquer pour fermer'}
          aria-label={fatigueType === 'rapid-clicks'
            ? 'Suggestion de pause — rythme rapide'
            : fatigueType === 'consecutive-undos'
            ? 'Suggestion — consulter l\'aide-mémoire'
            : 'Suggestion de pause'}
        >
          {fatigueType === 'rapid-clicks'
            ? 'Prends ton temps, c\'est correct d\'aller à ton rythme.'
            : fatigueType === 'consecutive-undos'
            ? 'Tu hésites\u00a0? L\'aide-mémoire peut t\'aider.'
            : 'Prends une pause si tu veux, ton travail est sauvegardé.'}
        </span>
      ) : showProblemReminder ? (
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
      {exampleMode && (
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {examplePhaseIndex > 0 && (
            <button
              onClick={onExamplePrev}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                background: '#fff',
                color: UI_TEXT_SECONDARY,
                border: `1px solid ${UI_BORDER}`,
                borderRadius: 4,
                cursor: 'pointer',
                minHeight: MIN_BUTTON_SIZE_PX,
              }}
            >
              ← Précédent
            </button>
          )}
          {!showExampleTry && (
            <button
              onClick={onExampleNext}
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
              Suivant → ({examplePhaseIndex + 1}/{examplePhaseCount})
            </button>
          )}
          {showExampleTry && (
            <button
              onClick={onExampleTry}
              data-testid="example-try-button"
              style={{
                padding: '4px 14px',
                fontSize: 12,
                fontWeight: 600,
                background: '#2E7D32',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                minHeight: MIN_BUTTON_SIZE_PX,
              }}
            >
              Essayer
            </button>
          )}
          <button
            onClick={onExampleExit}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              background: 'none',
              color: UI_TEXT_SECONDARY,
              border: `1px solid #D5D0E0`,
              borderRadius: 4,
              cursor: 'pointer',
              minHeight: MIN_BUTTON_SIZE_PX,
            }}
          >
            Retour
          </button>
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
  // role="status" + aria-live="polite" + aria-atomic="true" sur ce span uniquement.
  // Lecteurs d'écran relisent le message complet à chaque changement sans fragmentation.
  const liveProps = {
    role: 'status',
    'aria-live': 'polite' as const,
    'aria-atomic': true as const,
  };
  if (sep === -1) {
    return <span {...liveProps} style={{ flex: 1 }}>{message}</span>;
  }
  const badge = message.slice(0, sep);
  const instruction = message.slice(sep + 3);
  const badgeColor = variant === 'relance' ? '#7545A5' : UI_PRIMARY;
  return (
    <span {...liveProps} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
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
