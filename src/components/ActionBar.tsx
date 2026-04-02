import { useState, useEffect } from 'react';
import { canUndo, canRedo } from '../model/undo';
import type { UndoManager, DominantHand } from '../model/types';
import { MIN_BUTTON_SIZE_PX, MIN_BUTTON_GAP_PX } from '../config/accessibility';
import { UI_BG, UI_BORDER, UI_PRIMARY, UI_DESTRUCTIVE, UI_TEXT_SECONDARY, UI_SURFACE, UI_DISABLED_BG } from '../config/theme';
import { UndoIcon, RedoIcon, DeleteIcon, SettingsIcon, HelpIcon, CameraIcon } from './ToolIcons';

interface ActionBarProps {
  undoManager: UndoManager;
  deleteMode: boolean;
  dominantHand?: DominantHand;
  onUndo: () => void;
  onRedo: () => void;
  onToggleDeleteMode: () => void;
  onRecommencer: () => void;
  onShowGuide: () => void;
  onShowSettings: () => void;
  onShowSlotManager: () => void;
  onExportImage?: () => void;
  onExportPdf?: () => void;
  sessionTimer?: { formatted: string; alerted: boolean };
}

export function ActionBar({
  undoManager,
  deleteMode,
  dominantHand = 'right',
  onUndo,
  onRedo,
  onToggleDeleteMode,
  onRecommencer,
  onShowGuide,
  onShowSettings,
  onShowSlotManager,
  onExportImage,
  onExportPdf,
  sessionTimer,
}: ActionBarProps) {
  // showMore removed — fullscreen is now a standalone toggle
  return (
    <div data-testid="action-bar" style={{
      display: 'flex',
      flexDirection: dominantHand === 'left' ? 'row-reverse' : 'row',
      gap: MIN_BUTTON_GAP_PX,
      padding: '6px 16px',
      background: UI_BG,
      borderTop: `1px solid ${UI_BORDER}`,
      flexShrink: 0,
      alignItems: 'center',
    }}>
      {/* Undo */}
      <ActionBtn
        onClick={onUndo}
        disabled={!canUndo(undoManager)}
        title="Annuler (Ctrl+Z)"
        aria-label="Annuler"
      >
        <UndoIcon /> Annuler
      </ActionBtn>

      {/* Redo */}
      <ActionBtn
        onClick={onRedo}
        disabled={!canRedo(undoManager)}
        title="Refaire (Ctrl+Shift+Z)"
        aria-label="Refaire"
      >
        <RedoIcon /> Refaire
      </ActionBtn>

      <Separator />

      {/* Delete mode toggle */}
      <ActionBtn
        onClick={onToggleDeleteMode}
        active={deleteMode}
        destructive
        title="Supprimer — cliquer sur un élément"
        aria-pressed={deleteMode}
      >
        <DeleteIcon /> Supprimer
      </ActionBtn>

      <Separator />

      {/* Recommencer */}
      <ActionBtn onClick={onRecommencer} title="Effacer les pièces, garder le problème">
        Recommencer
      </ActionBtn>

      {/* Reset moved to SettingsPanel — too risky for impulsive children */}

      <Separator />

      {/* Mes modélisations */}
      <ActionBtn
        onClick={onShowSlotManager}
        title="Mes modélisations"
        aria-label="Mes modélisations"
      >
        <FolderIcon /> Modélisations
      </ActionBtn>

      {/* Export image */}
      {onExportImage && (
        <ActionBtn onClick={onExportImage} title="Exporter une image de la modélisation" aria-label="Photo">
          <CameraIcon /> Photo
        </ActionBtn>
      )}

      {/* Export PDF */}
      {onExportPdf && (
        <ActionBtn onClick={onExportPdf} title="Exporter en PDF" aria-label="PDF">
          PDF
        </ActionBtn>
      )}

      <div style={{ flex: 1 }} />

      {/* R6: Session timer */}
      {sessionTimer && (
        <span style={{
          fontSize: 11,
          fontWeight: sessionTimer.alerted ? 600 : 400,
          color: sessionTimer.alerted ? '#9060C0' : UI_TEXT_SECONDARY,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {sessionTimer.formatted}
        </span>
      )}

      {/* Settings */}
      <button
        onClick={onShowSettings}
        title="Paramètres"
        aria-label="Paramètres"
        style={{
          background: 'none',
          border: `1px solid ${UI_PRIMARY}`,
          borderRadius: '50%',
          width: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX,
          color: UI_PRIMARY,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SettingsIcon />
      </button>

      {/* Guide */}
      <button
        onClick={onShowGuide}
        title="Guide accompagnateur"
        aria-label="Guide accompagnateur"
        style={{
          background: 'none',
          border: `1px solid ${UI_PRIMARY}`,
          borderRadius: '50%',
          width: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX,
          color: UI_PRIMARY,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <HelpIcon />
      </button>

      {/* Fullscreen toggle — same position as GéoMolo/TracéVite */}
      <FullscreenToggle />
    </div>
  );
}

function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <button
      onClick={() => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen?.();
        }
      }}
      title="Mode présentation"
      aria-label="Mode présentation"
      data-testid="demo-toggle"
      style={{
        minWidth: MIN_BUTTON_SIZE_PX,
        height: MIN_BUTTON_SIZE_PX,
        padding: 0,
        border: 'none',
        borderRadius: 4,
        background: isFullscreen ? UI_PRIMARY : 'transparent',
        color: isFullscreen ? '#FFF' : UI_PRIMARY,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isFullscreen ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 1v4H1M11 1v4h4M15 11h-4v4M1 11h4v4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" />
        </svg>
      )}
    </button>
  );
}

function ActionBtn({ children, onClick, disabled, active, destructive, title, 'aria-label': ariaLabel, 'aria-pressed': ariaPressed }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  destructive?: boolean;
  title?: string;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
}) {
  const isDestructiveActive = destructive && active;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        fontSize: 12,
        borderRadius: 6,
        background: isDestructiveActive ? UI_DESTRUCTIVE : UI_SURFACE,
        border: `2px solid ${isDestructiveActive ? UI_DESTRUCTIVE : disabled ? UI_DISABLED_BG : UI_BORDER}`,
        color: isDestructiveActive ? '#fff' : disabled ? UI_BORDER : UI_TEXT_SECONDARY,
        fontWeight: isDestructiveActive ? 700 : undefined,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        minHeight: MIN_BUTTON_SIZE_PX,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div style={{ width: 1, height: 24, background: UI_BORDER, margin: '0 4px' }} />;
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path
        d="M3 5a2 2 0 012-2h3.172a2 2 0 011.414.586l1.828 1.828A2 2 0 0012.828 6H15a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </svg>
  );
}
