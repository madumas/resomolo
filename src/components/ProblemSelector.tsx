import { PROBLEM_PRESETS, type ProblemPreset } from '../config/problems';
import { UI_PRIMARY, UI_BG, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from '../config/theme';

interface ProblemSelectorProps {
  onSelect: (problem: ProblemPreset) => void;
  onClose: () => void;
}

export function ProblemSelector({ onSelect, onClose }: ProblemSelectorProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
      }}
    >
    <div onClick={e => e.stopPropagation()} style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      border: '1px solid #E5E7EB',
      maxWidth: 400,
      width: '90%',
    }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: UI_PRIMARY, marginBottom: 16 }}>
        Choisis un problème
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PROBLEM_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              padding: '12px 16px',
              background: UI_BG,
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
              minHeight: 44,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: UI_TEXT_PRIMARY }}>
              {preset.title}
            </span>
            {preset.text && (
              <span style={{ fontSize: 12, color: UI_TEXT_SECONDARY, lineHeight: 1.4 }}>
                {preset.text.length > 80 ? preset.text.slice(0, 80) + '...' : preset.text}
              </span>
            )}
            {!preset.text && (
              <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
                Travaille avec ton cahier
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
    </div>
  );
}
