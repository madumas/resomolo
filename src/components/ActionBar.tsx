import { useState, useEffect, useRef } from 'react';
import { canUndo, canRedo } from '../model/undo';
import type { UndoManager, DominantHand, SettingsProfile } from '../model/types';
import { MIN_BUTTON_SIZE_PX, MIN_BUTTON_GAP_PX } from '../config/accessibility';
import { UI_BG, UI_BORDER, UI_PRIMARY, UI_DESTRUCTIVE, UI_TEXT_SECONDARY, UI_SURFACE, UI_DISABLED_BG } from '../config/theme';
import { UndoIcon, RedoIcon, FocusIcon, SettingsIcon, HelpIcon, CameraIcon } from './ToolIcons';
import { AboutDialog } from './AboutDialog';

interface ActionBarProps {
  undoManager: UndoManager;
  focusMode: boolean;
  dominantHand?: DominantHand;
  onUndo: () => void;
  onRedo: () => void;
  onToggleFocusMode: () => void;
  onRecommencer: () => void;
  onShowGuide: () => void;
  onShowSettings: () => void;
  onShowSlotManager: () => void;
  onExportImage?: () => void;
  onExportPdf?: () => void;
  onShareLink?: () => void;
  onStartTutorial?: () => void;
  onShowExamples?: () => void;
  onShowAideMemoire?: () => void;
  sessionTimer?: { formatted: string; alerted: boolean };
  activeProfile?: SettingsProfile;
  showSaveIndicator?: boolean;
}

export function ActionBar({
  undoManager,
  focusMode,
  dominantHand = 'right',
  onUndo,
  onRedo,
  onToggleFocusMode,
  onRecommencer,
  onShowGuide,
  onShowSettings,
  onShowSlotManager,
  onExportImage,
  onExportPdf,
  onShareLink,
  onStartTutorial,
  onShowExamples,
  onShowAideMemoire,
  sessionTimer,
  activeProfile = 'custom',
  showSaveIndicator,
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

      {/* Focus mode toggle */}
      <ActionBtn
        onClick={onToggleFocusMode}
        active={focusMode}
        title="Mode concentré — estompe les autres pièces"
        aria-pressed={focusMode}
      >
        <FocusIcon />
      </ActionBtn>

      <Separator />

      {/* Tout effacer */}
      <ActionBtn onClick={onRecommencer} title="Effacer les pièces, garder le problème">
        Tout effacer
      </ActionBtn>

      {/* Reset moved to SettingsPanel — too risky for impulsive children */}

      <div style={{ flex: 1 }} />

      {/* Save indicator */}
      {showSaveIndicator && (
        <span style={{
          fontSize: 10,
          color: '#0B7285',
          fontWeight: 500,
          opacity: 0.8,
          transition: 'opacity 0.3s',
        }}>
          ✓ Sauvegardé
        </span>
      )}

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
          borderRadius: 6,
          minHeight: MIN_BUTTON_SIZE_PX,
          padding: '4px 10px',
          color: UI_PRIMARY,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <FolderIcon /> Mes travaux
      </button>

      {/* Partager */}
      <ShareMenu
        onExportImage={onExportImage}
        onExportPdf={onExportPdf}
        onShareLink={onShareLink}
      />

      {/* Settings — dot indicator when a non-custom profile is active */}
      <button
        onClick={onShowSettings}
        title="Paramètres"
        aria-label={activeProfile !== 'custom' ? `Paramètres (profil actif)` : 'Paramètres'}
        style={{
          background: 'none',
          border: `1px solid ${activeProfile !== 'custom' ? '#10B981' : UI_PRIMARY}`,
          borderRadius: '50%',
          width: MIN_BUTTON_SIZE_PX,
          height: MIN_BUTTON_SIZE_PX,
          color: activeProfile !== 'custom' ? '#10B981' : UI_PRIMARY,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <SettingsIcon />
        {activeProfile !== 'custom' && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 8, height: 8, borderRadius: '50%',
            background: '#10B981', border: '2px solid #fff',
          }} />
        )}
      </button>

      {/* Menu aide */}
      <HelpMenu onShowGuide={onShowGuide} onStartTutorial={onStartTutorial} onShowExamples={onShowExamples} onShowAideMemoire={onShowAideMemoire} />

      {/* Fullscreen toggle — same position as GéoMolo */}
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

function HelpMenu({ onShowGuide, onStartTutorial, onShowExamples, onShowAideMemoire }: {
  onShowGuide: () => void;
  onStartTutorial?: () => void;
  onShowExamples?: () => void;
  onShowAideMemoire?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          title="Aide"
          aria-label="Aide"
          aria-haspopup="true"
          aria-expanded={open}
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
        {open && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: 8,
              background: '#fff',
              border: `1px solid ${UI_BORDER}`,
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              zIndex: 50,
              minWidth: 200,
            }}
          >
            {onStartTutorial && (
              <ShareRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M4 2v10l8-5z" /></svg>}
                label="Tutoriel"
                onClick={() => { onStartTutorial(); setOpen(false); }}
              />
            )}
            {onShowAideMemoire && (
              <ShareRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5" /><text x="7" y="10" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none">?</text></svg>}
                label="Quel schéma choisir?"
                onClick={() => { onShowAideMemoire(); setOpen(false); }}
              />
            )}
            {onShowExamples && (
              <ShareRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="1" width="10" height="12" rx="1" /><line x1="4" y1="4" x2="10" y2="4" /><line x1="4" y1="7" x2="10" y2="7" /><line x1="4" y1="10" x2="7" y2="10" /></svg>}
                label="Exemples résolus"
                onClick={() => { onShowExamples(); setOpen(false); }}
              />
            )}
            <ShareRow
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 1C4 1 2 3 2 5.5S4 10 7 13c3-3 5-5.5 5-7.5S10 1 7 1z" /><circle cx="7" cy="5.5" r="1.5" /></svg>}
              label="Guide pour l'adulte"
              onClick={() => { onShowGuide(); setOpen(false); }}
            />
            <div style={{ height: 1, background: UI_BORDER, margin: '2px 8px' }} />
            <ShareRow
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11V3h8v8H3zM6 3v8M3 7h8" /><path d="M9 1l4 0 0 4" strokeWidth="1.2" /><path d="M13 1L9 5" strokeWidth="1.2" /></svg>}
              label="Documentation"
              onClick={() => { window.open('docs/index.html', '_blank'); setOpen(false); }}
            />
            <ShareRow
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="6" /><path d="M7 4v4M7 10v.5" strokeLinecap="round" /></svg>}
              label="À propos"
              onClick={() => { setShowAbout(true); setOpen(false); }}
            />
          </div>
        )}
      </div>
    </>
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
