import { useState } from 'react';
import type { ToolType, ToolbarMode } from '../model/types';
import { MIN_BUTTON_GAP_PX } from '../config/accessibility';
import { UI_BORDER, UI_SURFACE, UI_PRIMARY, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from '../config/theme';
import { ModeSelector } from './ModeSelector';
import { Logo } from './Logo';
import { AboutDialog } from './AboutDialog';
import { JetonIcon, BarreIcon, DroiteNumeriqueIcon, CalculIcon, ReponseIcon, BoiteIcon, GroupeIcon, TableauIcon, EtiquetteIcon, FlecheIcon, DeplacerIcon } from './ToolIcons';

interface ToolbarProps {
  activeTool: ToolType;
  toolbarMode: ToolbarMode;
  onSelectTool: (tool: ToolType) => void;
  onModeChange: (mode: ToolbarMode) => void;
  onNewProblem: () => void;
  dimmed?: boolean;
  availablePieces?: string[] | null;
}

type ToolDef = { type: NonNullable<ToolType>; label: string; Icon: React.ComponentType };

// Mode Simplifié : 4 outils de base
const SIMPLE_TOOLS: ToolDef[] = [
  { type: 'jeton', label: 'Jeton', Icon: JetonIcon },
  { type: 'barre', label: 'Barre', Icon: BarreIcon },
  { type: 'boite', label: 'Boîte', Icon: BoiteIcon },
  { type: 'groupe', label: 'Groupe', Icon: GroupeIcon },
  { type: 'deplacer', label: 'Déplacer', Icon: DeplacerIcon },
];

// Mode Complet : tous les outils
const ALL_TOOLS: ToolDef[] = [
  { type: 'jeton', label: 'Jeton', Icon: JetonIcon },
  { type: 'barre', label: 'Barre', Icon: BarreIcon },
  { type: 'droiteNumerique', label: 'Droite', Icon: DroiteNumeriqueIcon },
  { type: 'boite', label: 'Boîte', Icon: BoiteIcon },
  { type: 'groupe', label: 'Groupe', Icon: GroupeIcon },
  { type: 'calcul', label: 'Calcul', Icon: CalculIcon },
  { type: 'reponse', label: 'Réponse', Icon: ReponseIcon },
  { type: 'tableau', label: 'Tableau', Icon: TableauIcon },
  { type: 'etiquette', label: 'Étiquette', Icon: EtiquetteIcon },
  { type: 'fleche', label: 'Flèche', Icon: FlecheIcon },
  { type: 'deplacer', label: 'Déplacer', Icon: DeplacerIcon },
];

const SIMPLE_TYPES: Set<string> = new Set(SIMPLE_TOOLS.map(t => t.type));

export function Toolbar({ activeTool, toolbarMode, onSelectTool, onModeChange, onNewProblem, dimmed, availablePieces }: ToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const isComplet = toolbarMode === 'complet';
  // Show all tools if: complet mode, user clicked ⋯, or active tool is not in simple set
  const showAll = isComplet || showMore || (activeTool !== null && !SIMPLE_TYPES.has(activeTool as string));

  let visibleTools = showAll ? ALL_TOOLS : SIMPLE_TOOLS;

  // Filter tools if availablePieces is set (always keep 'deplacer')
  if (availablePieces) {
    visibleTools = visibleTools.filter(t => t.type === 'deplacer' || availablePieces.includes(t.type));
  }

  return (
    <>
    {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
    <div data-testid="toolbar" role="toolbar" aria-label="Outils de modélisation" style={{
      display: 'flex',
      padding: '0 8px',
      background: UI_SURFACE,
      borderBottom: `1px solid ${UI_BORDER}`,
      flexShrink: 0,
      alignItems: 'center',
      height: 64,
      fontSize: 13,
    }}>
      {/* Zone gauche : logo + outils (scrollable) */}
      <div style={{
        display: 'flex',
        padding: '0 8px',
        gap: MIN_BUTTON_GAP_PX,
        alignItems: 'center',
        flex: 1,
        overflow: 'hidden',
        height: '100%',
      }}>
        <button
          onClick={() => setShowAbout(true)}
          aria-label="À propos de RésoMolo"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          <Logo height={32} />
        </button>
        <div style={{ width: 1, height: 40, background: UI_BORDER, margin: '0 4px', flexShrink: 0 }} />
        {visibleTools.map(tool => (
          <ToolButton
            key={tool.type}
            tool={tool}
            active={activeTool === tool.type}
            dimmed={!!dimmed && activeTool !== tool.type}
            onClick={() => onSelectTool(activeTool === tool.type ? null : tool.type)}
          />
        ))}
        {!isComplet && !showAll && (
          <button
            onClick={() => setShowMore(true)}
            aria-label="Plus d'outils"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 6,
              fontSize: 11,
              color: UI_TEXT_SECONDARY,
              minWidth: 44,
              height: 56,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>⋯</span>
          </button>
        )}
      </div>

      {/* Zone droite : ModeSelector + Problèmes */}
      <div style={{
        display: 'flex',
        padding: '0 8px',
        gap: MIN_BUTTON_GAP_PX,
        alignItems: 'center',
        flexShrink: 0,
        marginLeft: MIN_BUTTON_GAP_PX,
        height: '100%',
      }}>
        <ModeSelector mode={toolbarMode} onChange={onModeChange} />
        <button
          onClick={onNewProblem}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: 'transparent',
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 6,
            color: UI_TEXT_PRIMARY,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          Problèmes
        </button>
      </div>
    </div>
    </>
  );
}

function ToolButton({ tool, active, dimmed, onClick }: {
  tool: ToolDef;
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      data-testid={`tool-${tool.type}`}
      aria-label={tool.label}
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 8px',
        background: active ? '#EDE0FA' : 'transparent',
        border: active ? `2px solid ${UI_PRIMARY}` : '1px solid transparent',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        color: active ? UI_PRIMARY : UI_TEXT_PRIMARY,
        minWidth: 44,
        height: 56,
        opacity: dimmed ? 0.5 : 1,
        transition: 'opacity 0.3s',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <tool.Icon />
      <span>{tool.label}</span>
    </button>
  );
}
