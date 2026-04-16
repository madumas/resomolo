import { useRef } from 'react';
import type { Settings, ToleranceProfile, SoundMode, TextScale, DominantHand, SettingsProfile, FontFamily, LetterSpacing, TTSRate } from '../model/types';
import { SETTINGS_PROFILES } from '../model/types';
import { UI_PRIMARY, UI_BORDER, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from '../config/theme';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  onReset?: () => void;
}

export function SettingsPanel({ settings, onChange, onClose, onExport, onImport, onReset }: SettingsPanelProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(dialogRef, onClose);
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch, activeProfile: 'custom' });

  const handleProfileChange = (profile: SettingsProfile) => {
    if (profile !== 'custom') {
      onChange({ ...settings, ...SETTINGS_PROFILES[profile], activeProfile: profile });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paramètres"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          maxWidth: 480,
          width: '90%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, color: UI_PRIMARY, marginBottom: 20, fontWeight: 700 }}>
          Paramètres
        </h2>

        {/* Profil */}
        <SettingGroup label="Profil">
          <ButtonGroup<SettingsProfile>
            options={[
              { value: 'motricite-legere', label: 'Aide légère' },
              { value: 'motricite-importante', label: 'Aide maximale' },
              { value: 'motricite-attention', label: 'Aide + Minuterie' },
              { value: 'motricite-lecture', label: 'Aide + Gros texte' },
              { value: 'motricite-math', label: 'TDC + Math' },
              { value: 'custom', label: 'Personnalisé' },
            ]}
            selected={settings.activeProfile}
            onChange={handleProfileChange}
          />
        </SettingGroup>

        <SectionDivider label="Motricité" />

        {/* Tolérance */}
        <SettingGroup label="Tolérance de clic">
          <ButtonGroup<ToleranceProfile>
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'large', label: 'Large' },
              { value: 'tres-large', label: 'Très large' },
            ]}
            selected={settings.toleranceProfile}
            onChange={v => update({ toleranceProfile: v })}
          />
        </SettingGroup>

        {/* Relance */}
        <SettingGroup label="Questions de relance">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ToggleBtn
              active={settings.relanceDelayMs > 0}
              onChange={on => update({ relanceDelayMs: on ? 30000 : 0 })}
            />
            {settings.relanceDelayMs > 0 && (
              <label style={{ fontSize: 13, color: UI_TEXT_SECONDARY, display: 'flex', alignItems: 'center', gap: 6 }}>
                Délai :
                <input
                  type="number"
                  inputMode="numeric"
                  min={30}
                  max={120}
                  value={Math.round(settings.relanceDelayMs / 1000)}
                  onChange={e => {
                    const sec = Math.max(30, Math.min(120, Number(e.target.value) || 30));
                    update({ relanceDelayMs: sec * 1000 });
                  }}
                  style={{ width: 52, padding: '4px 6px', borderRadius: 4, border: '1px solid #D5D0E0', fontSize: 13, textAlign: 'center' }}
                />
                sec
              </label>
            )}
          </div>
        </SettingGroup>

        {/* Cursor smoothing */}
        <SettingGroup label="Lissage du curseur">
          <ToggleBtn
            active={settings.cursorSmoothing}
            onChange={on => update({ cursorSmoothing: on })}
          />
        </SettingGroup>

        {/* Smoothing alpha */}
        {settings.cursorSmoothing && (
          <SettingGroup label="Intensité du lissage">
            <input
              type="range" min={0.15} max={0.40} step={0.05}
              value={settings.smoothingAlpha}
              onChange={e => update({ smoothingAlpha: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: UI_PRIMARY }}
            />
            <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, textAlign: 'center' }}>
              {settings.smoothingAlpha < 0.25 ? 'Fort' : settings.smoothingAlpha > 0.35 ? 'Léger' : 'Moyen'}
            </div>
          </SettingGroup>
        )}

        {/* Session timer */}
        <SectionDivider label="Session" />

        <SettingGroup label="Minuteur de session">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ToggleBtn
              active={settings.sessionTimerEnabled}
              onChange={on => update({ sessionTimerEnabled: on })}
            />
            {settings.sessionTimerEnabled && (
              <label style={{ fontSize: 13, color: UI_TEXT_SECONDARY, display: 'flex', alignItems: 'center', gap: 6 }}>
                Alerte après :
                <input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={60}
                  value={settings.sessionTimerAlertMinutes}
                  onChange={e => {
                    const min = Math.max(5, Math.min(60, Number(e.target.value) || 20));
                    update({ sessionTimerAlertMinutes: min });
                  }}
                  style={{ width: 52, padding: '4px 6px', borderRadius: 4, border: '1px solid #D5D0E0', fontSize: 13, textAlign: 'center' }}
                />
                min
              </label>
            )}
          </div>
        </SettingGroup>

        {/* Fatigue detection */}
        <SectionDivider label="Détection de fatigue" />

        <SettingGroup label="Détection de fatigue">
          <ToggleBtn
            active={settings.fatigueClickThreshold > 0 || settings.fatigueUndoThreshold > 0}
            onChange={on => update(on
              ? { fatigueClickThreshold: 15, fatigueUndoThreshold: 3, fatigueWindowMs: 30000 }
              : { fatigueClickThreshold: 0, fatigueUndoThreshold: 0 }
            )}
          />
        </SettingGroup>

        {(settings.fatigueClickThreshold > 0 || settings.fatigueUndoThreshold > 0) && (
          <>
            <SettingGroup label="Seuil clics rapides">
              <input
                type="range" min={5} max={30} step={1}
                value={settings.fatigueClickThreshold}
                onChange={e => update({ fatigueClickThreshold: Number(e.target.value) })}
                style={{ width: '100%', accentColor: UI_PRIMARY }}
              />
              <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, textAlign: 'center' }}>
                {settings.fatigueClickThreshold} clics en {Math.round(settings.fatigueWindowMs / 1000)}s
              </div>
            </SettingGroup>
            <SettingGroup label="Seuil annulations consécutives">
              <input
                type="range" min={1} max={6} step={1}
                value={settings.fatigueUndoThreshold}
                onChange={e => update({ fatigueUndoThreshold: Number(e.target.value) })}
                style={{ width: '100%', accentColor: UI_PRIMARY }}
              />
              <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, textAlign: 'center' }}>
                {settings.fatigueUndoThreshold} annulations
              </div>
            </SettingGroup>
          </>
        )}

        {/* Text scale */}
        <SectionDivider label="Affichage" />

        <SettingGroup label="Taille du texte">
          <ButtonGroup<`${TextScale}`>
            options={[
              { value: '1', label: '1×' },
              { value: '1.25', label: '1,25×' },
              { value: '1.5', label: '1,5×' },
            ]}
            selected={`${settings.textScale}`}
            onChange={v => update({ textScale: parseFloat(v) as TextScale })}
          />
        </SettingGroup>

        {/* High contrast */}
        <SettingGroup label="Contraste élevé">
          <ToggleBtn
            active={settings.highContrast}
            onChange={on => update({ highContrast: on })}
          />
        </SettingGroup>

        {/* Keyboard shortcuts */}
        <SettingGroup label="Raccourcis clavier">
          <ToggleBtn
            active={settings.keyboardShortcutsEnabled}
            onChange={on => update({ keyboardShortcutsEnabled: on })}
          />
        </SettingGroup>

        {/* Sound mode */}
        <SectionDivider label="Audio" />

        <SettingGroup label="Sons">
          <ButtonGroup<SoundMode>
            options={[
              { value: 'off', label: 'Désactivés' },
              { value: 'reduced', label: 'Réduit' },
              { value: 'full', label: 'Complet' },
            ]}
            selected={settings.soundMode}
            onChange={v => update({ soundMode: v })}
          />
        </SettingGroup>

        {/* Volume */}
        {settings.soundMode !== 'off' && (
          <SettingGroup label="Volume">
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={settings.soundGain}
              onChange={e => update({ soundGain: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: UI_PRIMARY }}
            />
          </SettingGroup>
        )}

        {/* Dominant hand */}
        <SectionDivider label="Interface" />

        <SettingGroup label="Main dominante">
          <ButtonGroup<DominantHand>
            options={[
              { value: 'left', label: 'Gauche' },
              { value: 'right', label: 'Droite' },
            ]}
            selected={settings.dominantHand}
            onChange={v => update({ dominantHand: v })}
          />
        </SettingGroup>

        {/* Problem always visible */}
        <SettingGroup label="Problème toujours visible">
          <ToggleBtn
            active={settings.problemAlwaysVisible}
            onChange={on => update({ problemAlwaysVisible: on })}
          />
        </SettingGroup>

        {/* Suggested zones */}
        <SettingGroup label="Zones suggérées sur le canevas">
          <ToggleBtn
            active={settings.showSuggestedZones}
            onChange={on => update({ showSuggestedZones: on })}
          />
        </SettingGroup>

        {/* Token counter */}
        <SettingGroup label="Compteur de jetons">
          <ToggleBtn
            active={settings.showTokenCounter}
            onChange={on => update({ showTokenCounter: on })}
          />
        </SettingGroup>

        {/* Police */}
        <SettingGroup label="Police">
          <ButtonGroup<FontFamily>
            options={[
              { value: 'system', label: 'Système' },
              { value: 'atkinson', label: 'Lisible' },
              { value: 'opendyslexic', label: 'OpenDyslexic' },
            ]}
            selected={settings.fontFamily}
            onChange={v => update({ fontFamily: v })}
          />
        </SettingGroup>

        {/* Espacement des lettres — only when not system font */}
        {settings.fontFamily !== 'system' && (
          <SettingGroup label="Espacement des lettres">
            <ButtonGroup<`${LetterSpacing}`>
              options={[
                { value: '0', label: 'Normal' },
                { value: '0.05', label: 'Aéré' },
                { value: '0.1', label: 'Très aéré' },
              ]}
              selected={`${settings.letterSpacing}`}
              onChange={v => update({ letterSpacing: parseFloat(v) as LetterSpacing })}
            />
          </SettingGroup>
        )}

        {/* Lecture à voix haute */}
        <SettingGroup label="Lecture à voix haute">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ToggleBtn
              active={settings.ttsEnabled}
              onChange={on => update({ ttsEnabled: on })}
            />
            {settings.ttsEnabled && (
              <ButtonGroup<`${TTSRate}`>
                options={[
                  { value: '0.7', label: 'Lent' },
                  { value: '1', label: 'Normal' },
                  { value: '1.3', label: 'Rapide' },
                ]}
                selected={`${settings.ttsRate}`}
                onChange={v => update({ ttsRate: parseFloat(v) as TTSRate })}
              />
            )}
          </div>
        </SettingGroup>

        {/* Lecture guidée */}
        <SettingGroup label="Lecture guidée (phrase par phrase)">
          <ToggleBtn
            active={settings.guidedReadingEnabled}
            onChange={on => update({ guidedReadingEnabled: on })}
          />
        </SettingGroup>

        {/* Stockage */}
        <SettingGroup label="Stockage">
          <div style={{ display: 'flex', gap: 8 }}>
            {onExport && (
              <button
                onClick={onExport}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#fff',
                  border: `2px solid ${UI_BORDER}`,
                  color: UI_TEXT_SECONDARY,
                  cursor: 'pointer',
                }}
              >
                Exporter
              </button>
            )}
            {onImport && (
              <label
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#fff',
                  border: `2px solid ${UI_BORDER}`,
                  color: UI_TEXT_SECONDARY,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Importer
                <input
                  type="file"
                  accept=".resomolo,.modelivite"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) onImport(e.target.files[0]); }}
                />
              </label>
            )}
          </div>
        </SettingGroup>

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '12px',
            background: UI_PRIMARY,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Fermer
        </button>

        {/* Reset — moved here from ActionBar to reduce risk for impulsive children */}
        {onReset && (
          <button
            onClick={onReset}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '10px',
              background: '#fff',
              color: '#C82828',
              border: '1px solid #FCA5A5',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Tout effacer et relancer le tutoriel
          </button>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{
      borderTop: `1px solid ${UI_BORDER}`,
      marginTop: 8,
      marginBottom: 12,
      paddingTop: 10,
      fontSize: 11,
      fontWeight: 700,
      color: UI_TEXT_SECONDARY,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    }}>
      {label}
    </div>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: UI_TEXT_PRIMARY, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function ButtonGroup<T extends string>({ options, selected, onChange }: {
  options: { value: T; label: string }[];
  selected: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: selected === opt.value ? 700 : 400,
            background: selected === opt.value ? '#EDE0FA' : '#fff',
            border: `2px solid ${selected === opt.value ? UI_PRIMARY : UI_BORDER}`,
            color: selected === opt.value ? UI_PRIMARY : UI_TEXT_SECONDARY,
            cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToggleBtn({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      style={{
        minWidth: 44,
        minHeight: 44,
        padding: '6px 14px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        background: active ? '#EDE0FA' : '#fff',
        border: `2px solid ${active ? UI_PRIMARY : UI_BORDER}`,
        color: active ? UI_PRIMARY : UI_TEXT_SECONDARY,
        cursor: 'pointer',
      }}
    >
      {active ? 'Activé' : 'Désactivé'}
    </button>
  );
}
