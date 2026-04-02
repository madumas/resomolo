import { useState } from 'react';
import type { ToolType, ToolbarMode } from '../model/types';
import { MIN_BUTTON_GAP_PX } from '../config/accessibility';
import { UI_BORDER, UI_BG, UI_SURFACE, UI_PRIMARY, UI_TEXT_SECONDARY } from '../config/theme';
import { ModeSelector } from './ModeSelector';
import { Logo } from './Logo';
import { AboutDialog } from './AboutDialog';
import { JetonIcon, BarreIcon, DroiteNumeriqueIcon, CalculIcon, ReponseIcon, BoiteIcon, EtiquetteIcon, FlecheIcon, DeplacerIcon } from './ToolIcons';

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

const ESSENTIAL_TOOLS: ToolDef[] = [
  { type: 'jeton', label: 'Jeton', Icon: JetonIcon },
  { type: 'barre', label: 'Barre', Icon: BarreIcon },
  { type: 'droiteNumerique', label: 'Droite', Icon: DroiteNumeriqueIcon },
  { type: 'boite', label: 'Boîte', Icon: BoiteIcon },
  { type: 'calcul', label: 'Calcul', Icon: CalculIcon },
  { type: 'reponse', label: 'Réponse', Icon: ReponseIcon },
];

const SECONDARY_TOOLS: ToolDef[] = [
  { type: 'etiquette', label: 'Étiquette', Icon: EtiquetteIcon },
  { type: 'fleche', label: 'Flèche', Icon: FlecheIcon },
];

const DEPLACER_TOOL: ToolDef = { type: 'deplacer', label: 'Déplacer', Icon: DeplacerIcon };

const SECONDARY_TYPES: Set<string> = new Set(SECONDARY_TOOLS.map(t => t.type));

export function Toolbar({ activeTool, toolbarMode, onSelectTool, onModeChange, onNewProblem, dimmed, availablePieces }: ToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const isComplet = toolbarMode === 'complet';
  const showSecondary = isComplet || showMore || (activeTool !== null && SECONDARY_TYPES.has(activeTool as string));

  let visibleTools = showSecondary
    ? [...ESSENTIAL_TOOLS, ...SECONDARY_TOOLS, DEPLACER_TOOL]
    : [...ESSENTIAL_TOOLS, DEPLACER_TOOL];

  // Filter tools if availablePieces is set (always keep 'deplacer')
  if (availablePieces) {
    visibleTools = visibleTools.filter(t => t.type === 'deplacer' || availablePieces.includes(t.type));
  }

  return (
    <>
    {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
    <div data-testid="toolbar" role="toolbar" aria-label="Outils de modélisation" style={{
      display: 'flex',
      padding: '6px 10px',
      background: UI_BG,
      borderBottom: `1px solid ${UI_BORDER}`,
      flexShrink: 0,
      alignItems: 'center',
    }}>
      {/* Zone gauche : logo + outils (scrollable) */}
      <div style={{
        display: 'flex',
        gap: MIN_BUTTON_GAP_PX,
        alignItems: 'center',
        flex: 1,
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setShowAbout(true)}
          aria-label="À propos de RésoMolo"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          <Logo height={34} />
        </button>
        <div style={{ width: 1, height: 44, background: UI_BORDER, marginRight: 4, flexShrink: 0 }} />
        {visibleTools.map(tool => (
          <ToolButton
            key={tool.type}
            tool={tool}
            active={activeTool === tool.type}
            dimmed={!!dimmed && activeTool !== tool.type}
            onClick={() => onSelectTool(activeTool === tool.type ? null : tool.type)}
          />
        ))}
        {!isComplet && !showSecondary && (
          <button
            onClick={() => setShowMore(true)}
            aria-label="Plus d'outils"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 10px',
              background: UI_SURFACE,
              border: `1px solid ${UI_BORDER}`,
              borderRadius: 6,
              fontSize: 10,
              color: UI_TEXT_SECONDARY,
              minWidth: 52,
              minHeight: 44,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 10 }}>Plus</span>
          </button>
        )}
      </div>

      {/* Zone droite : ModeSelector + Problèmes */}
      <div style={{
        display: 'flex',
        gap: MIN_BUTTON_GAP_PX,
        alignItems: 'center',
        flexShrink: 0,
        marginLeft: MIN_BUTTON_GAP_PX,
      }}>
        <ModeSelector mode={toolbarMode} onChange={onModeChange} />
        <button
          onClick={onNewProblem}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: UI_SURFACE,
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 6,
            color: UI_TEXT_SECONDARY,
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
        gap: 2,
        padding: '4px 10px',
        background: active ? '#EDE0FA' : UI_SURFACE,
        border: `${active ? 2 : 1}px solid ${active ? UI_PRIMARY : UI_BORDER}`,
        borderRadius: 6,
        fontSize: 11,
        color: active ? UI_PRIMARY : UI_TEXT_SECONDARY,
        minWidth: 52,
        minHeight: 44,
        opacity: dimmed ? 0.5 : 1,
        transition: 'opacity 0.3s',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <tool.Icon />
      <span style={{ fontSize: 11 }}>{tool.label}</span>
    </button>
  );
}
