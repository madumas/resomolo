import { useState, useEffect, useRef } from 'react';
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
  onShareLink?: () => void;
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
  onShareLink,
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

      {/* Mes travaux — zone droite comme GéoMolo */}
      <button
        onClick={onShowSlotManager}
        title="Mes travaux"
        aria-label="Mes travaux"
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
        <FolderIcon />
      </button>

      {/* Partager */}
      <ShareMenu
        onExportImage={onExportImage}
        onExportPdf={onExportPdf}
        onShareLink={onShareLink}
      />

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

function ShareMenu({ onExportImage, onExportPdf, onShareLink }: {
  onExportImage?: () => void;
  onExportPdf?: () => void;
  onShareLink?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  if (!onExportImage && !onExportPdf && !onShareLink) return null;

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <ActionBtn
        onClick={() => setOpen(!open)}
        title="Partager"
        aria-label="Partager"
        active={open}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 8v4h10V8M7 1v8M4 4l3-3 3 3" />
        </svg>
        {' '}Partager
      </ActionBtn>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            background: '#fff',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 20,
            minWidth: 180,
          }}
        >
          {onExportImage && (
            <ShareRow icon={<CameraIcon />} label="Photo (PNG)" onClick={() => { onExportImage(); setOpen(false); }} />
          )}
          {onExportPdf && (
            <ShareRow icon={<span style={{ fontSize: 13, fontWeight: 600 }}>PDF</span>} label="Document (PDF)" onClick={() => { onExportPdf(); setOpen(false); }} />
          )}
          {onShareLink && (
            <ShareRow icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 8a3 3 0 004 1l2-2a3 3 0 00-4-4L6 5M8 6a3 3 0 00-4-1L2 7a3 3 0 004 4l2-2" />
              </svg>
            } label="Lien & QR code" onClick={() => { onShareLink(); setOpen(false); }} />
          )}
        </div>
      )}
    </div>
  );
}

function ShareRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        minHeight: 48,
        background: 'none',
        border: 'none',
        borderRadius: 6,
        fontSize: 13,
        color: UI_PRIMARY,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}
      onPointerEnter={e => { (e.target as HTMLElement).style.background = '#F3F0FA'; }}
      onPointerLeave={e => { (e.target as HTMLElement).style.background = 'none'; }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>{icon}</span>
      {label}
    </button>
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
        width: MIN_BUTTON_SIZE_PX,
        height: MIN_BUTTON_SIZE_PX,
        padding: 0,
        border: `1px solid ${UI_PRIMARY}`,
        borderRadius: '50%',
        background: isFullscreen ? UI_PRIMARY : 'none',
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
