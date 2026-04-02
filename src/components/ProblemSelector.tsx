import { useState } from 'react';
import { PROBLEM_PRESETS, type ProblemPreset } from '../config/problems';
import { UI_PRIMARY, UI_BG, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_BORDER } from '../config/theme';
import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';

interface ProblemSelectorProps {
  onSelect: (problem: ProblemPreset) => void;
  onClose: () => void;
}

type CycleFilter = 2 | 3 | 'all';
type DifficultyFilter = 1 | 2 | 3 | 'all';
type CategoryFilter = 'all' | 'additif' | 'multiplicatif' | 'complexe';

const CATEGORY_GROUPS: Record<Exclude<CategoryFilter, 'all'>, string[]> = {
  additif: ['addition', 'soustraction'],
  multiplicatif: ['multiplication', 'division', 'comparaison'],
  complexe: ['multi-etapes', 'partage'],
};

const LIBRE_PRESET: ProblemPreset = {
  id: 'libre',
  title: 'Problème libre',
  text: '',
  cycle: 2,
  category: 'addition',
  difficulty: 1,
};

function difficultyStars(d: 1 | 2 | 3): string {
  return '★'.repeat(d);
}

export function ProblemSelector({ onSelect, onClose }: ProblemSelectorProps) {
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const filtered = PROBLEM_PRESETS.filter(p => {
    if (cycleFilter !== 'all' && p.cycle !== cycleFilter) return false;
    if (difficultyFilter !== 'all' && p.difficulty !== difficultyFilter) return false;
    if (categoryFilter !== 'all' && !CATEGORY_GROUPS[categoryFilter].includes(p.category)) return false;
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Banque de problèmes"
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
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: '1px solid #E8E5F0',
          maxWidth: 520,
          width: '90%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: UI_PRIMARY, marginBottom: 16, flexShrink: 0 }}>
          Banque de problèmes
        </h2>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, flexShrink: 0 }}>
          {/* Cycle filter */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: UI_TEXT_PRIMARY, marginBottom: 6 }}>Cycle</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { value: 'all' as CycleFilter, label: 'Tous' },
                { value: 2 as CycleFilter, label: '2e cycle' },
                { value: 3 as CycleFilter, label: '3e cycle' },
              ]).map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setCycleFilter(opt.value)}
                  style={{
                    minWidth: MIN_BUTTON_SIZE_PX,
                    minHeight: MIN_BUTTON_SIZE_PX,
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: cycleFilter === opt.value ? 700 : 400,
                    background: cycleFilter === opt.value ? '#EDE0FA' : '#fff',
                    border: `2px solid ${cycleFilter === opt.value ? UI_PRIMARY : UI_BORDER}`,
                    color: cycleFilter === opt.value ? UI_PRIMARY : UI_TEXT_SECONDARY,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty filter */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: UI_TEXT_PRIMARY, marginBottom: 6 }}>Difficulté</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { value: 'all' as DifficultyFilter, label: 'Toutes' },
                { value: 1 as DifficultyFilter, label: '★' },
                { value: 2 as DifficultyFilter, label: '★★' },
                { value: 3 as DifficultyFilter, label: '★★★' },
              ]).map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setDifficultyFilter(opt.value)}
                  style={{
                    minWidth: MIN_BUTTON_SIZE_PX,
                    minHeight: MIN_BUTTON_SIZE_PX,
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: difficultyFilter === opt.value ? 700 : 400,
                    background: difficultyFilter === opt.value ? '#EDE0FA' : '#fff',
                    border: `2px solid ${difficultyFilter === opt.value ? UI_PRIMARY : UI_BORDER}`,
                    color: difficultyFilter === opt.value ? UI_PRIMARY : UI_TEXT_SECONDARY,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: UI_TEXT_PRIMARY, marginBottom: 6 }}>Type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { value: 'all' as CategoryFilter, label: 'Tous' },
                { value: 'additif' as CategoryFilter, label: 'Additif' },
                { value: 'multiplicatif' as CategoryFilter, label: 'Multiplicatif' },
                { value: 'complexe' as CategoryFilter, label: 'Complexe' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCategoryFilter(opt.value)}
                  style={{
                    minWidth: MIN_BUTTON_SIZE_PX,
                    minHeight: MIN_BUTTON_SIZE_PX,
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: categoryFilter === opt.value ? 700 : 400,
                    background: categoryFilter === opt.value ? '#EDE0FA' : '#fff',
                    border: `2px solid ${categoryFilter === opt.value ? UI_PRIMARY : UI_BORDER}`,
                    color: categoryFilter === opt.value ? UI_PRIMARY : UI_TEXT_SECONDARY,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable problem list */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: UI_TEXT_SECONDARY, fontSize: 13 }}>
                Aucun problème ne correspond aux filtres.
              </div>
            )}
            {filtered.map(preset => (
              <button
                key={preset.id}
                onClick={() => onSelect(preset)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 4,
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: UI_TEXT_PRIMARY, flex: 1 }}>
                    {preset.title}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: UI_TEXT_SECONDARY,
                    background: '#fff',
                    border: `1px solid ${UI_BORDER}`,
                    borderRadius: 4,
                    padding: '2px 6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    C{preset.cycle}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: '#B8860B',
                    background: '#FEF9E7',
                    border: '1px solid #F5E6A3',
                    borderRadius: 4,
                    padding: '2px 6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {difficultyStars(preset.difficulty)}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: UI_TEXT_SECONDARY, lineHeight: 1.4 }}>
                  {preset.text.length > 80 ? preset.text.slice(0, 80) + '...' : preset.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Problème libre — always visible, outside filters */}
        <button
          onClick={() => onSelect(LIBRE_PRESET)}
          style={{
            marginTop: 14,
            padding: '12px 16px',
            background: '#fff',
            border: `2px dashed ${UI_BORDER}`,
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: MIN_BUTTON_SIZE_PX,
            width: '100%',
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: UI_TEXT_PRIMARY }}>
            Problème libre
          </span>
          <br />
          <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
            Travaille avec ton cahier
          </span>
        </button>

        {/* Close button */}
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
