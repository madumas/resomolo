import React, { useState, useEffect, useRef } from 'react';
import type { ToolType, ToolbarMode } from '../model/types';
import { MIN_BUTTON_GAP_PX } from '../config/accessibility';
import { UI_BG, UI_BORDER, UI_SURFACE, UI_PRIMARY, UI_TEXT_PRIMARY } from '../config/theme';
import { ModeSelector } from './ModeSelector';
import { Logo } from './Logo';
import { AboutDialog } from './AboutDialog';
import { JetonIcon, BarreIcon, SchemaIcon, DroiteNumeriqueIcon, ArbreIcon, CalculIcon, ReponseIcon, BoiteIcon, TableauIcon, DiagrammeBandesIcon, DiagrammeLigneIcon, EtiquetteIcon, InconnueIcon, FlecheIcon, DeplacerIcon } from './ToolIcons';

interface ToolbarProps {
  activeTool: ToolType;
  toolbarMode: ToolbarMode;
  onSelectTool: (tool: ToolType) => void;
  onModeChange: (mode: ToolbarMode) => void;
  onNewProblem: () => void;
  dimmed?: boolean;
  availablePieces?: string[] | null;
}

export type ToolDef = { type: NonNullable<ToolType>; label: string; Icon: React.ComponentType };

// === Tool group definitions (source of truth) ===
// Labels = verbes d'action familiers dès le 1er cycle
// Colors = palette daltonien-safe (bleu/jaune/orange/violet/rose, pas vert/gris)

export type ToolGroup = {
  id: string;
  label: string;
  color: string;
  tools: ToolDef[];
  /** Tool types shown inline (always visible, not only in popover) */
  inlineTools: string[];
  /** Included in Essentiel mode? (false = Complet only) */
  essentiel: boolean;
};

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'compter', label: 'Compter', color: '#E8F0FE', essentiel: true,
    tools: [
      { type: 'jeton', label: 'Jeton', Icon: JetonIcon },
      { type: 'boite', label: 'Boîte', Icon: BoiteIcon },
      { type: 'diagrammeBandes', label: 'Bandes', Icon: DiagrammeBandesIcon },
    ],
    inlineTools: ['jeton', 'boite', 'diagrammeBandes'],
  },
  {
    id: 'comparer', label: 'Comparer', color: '#FFF8E1', essentiel: true,
    tools: [
      { type: 'barre', label: 'Barre', Icon: BarreIcon },
      { type: 'schema', label: 'Schéma', Icon: SchemaIcon },
      { type: 'droiteNumerique', label: 'Droite', Icon: DroiteNumeriqueIcon },
    ],
    inlineTools: ['barre', 'schema', 'droiteNumerique'],
  },
  {
    id: 'organiser', label: 'Organiser', color: '#FFF3E0', essentiel: false,
    tools: [
      { type: 'arbre', label: 'Arbre', Icon: ArbreIcon },
      { type: 'tableau', label: 'Tableau', Icon: TableauIcon },
      { type: 'diagrammeLigne', label: 'Ligne brisée', Icon: DiagrammeLigneIcon },
      { type: 'fleche', label: 'Flèche', Icon: FlecheIcon },
    ],
    inlineTools: [],
  },
  {
    id: 'calculer', label: 'Calculer', color: '#F3E8FD', essentiel: true,
    tools: [
      { type: 'calcul', label: 'Calcul', Icon: CalculIcon },
      { type: 'reponse', label: 'Réponse', Icon: ReponseIcon },
    ],
    inlineTools: ['calcul', 'reponse'],
  },
  {
    id: 'annoter', label: 'Annoter', color: '#FCE4EC', essentiel: true,
    tools: [
      { type: 'etiquette', label: 'Étiquette', Icon: EtiquetteIcon },
      { type: 'inconnue', label: 'Inconnue', Icon: InconnueIcon },
    ],
    inlineTools: ['etiquette', 'inconnue'],
  },
];

// Group membership lookup for inter-group spacing
const TOOL_GROUP_ID: Record<string, string> = {};
for (const g of TOOL_GROUPS) for (const t of g.tools) TOOL_GROUP_ID[t.type] = g.id;

// Inline tools (always directly visible in toolbar, not behind a popover)
const INLINE_TYPES: Set<string> = new Set(TOOL_GROUPS.flatMap(g => g.inlineTools));

export function Toolbar({ activeTool, toolbarMode, onSelectTool, onModeChange, onNewProblem, dimmed, availablePieces }: ToolbarProps) {
  const [showAbout, setShowAbout] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const toolbarScrollRef = useRef<HTMLDivElement>(null);
  const [hasScrollRight, setHasScrollRight] = useState(false);

  // Detect scroll overflow for tablet scroll indicator
  useEffect(() => {
    const el = toolbarScrollRef.current;
    if (!el) return;
    const check = () => setHasScrollRight(el.scrollWidth > el.clientWidth + el.scrollLeft + 4);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [toolbarMode]);

  const isComplet = toolbarMode === 'complet';

  // Build visible groups filtered by mode + availablePieces
  const visibleGroups = TOOL_GROUPS
    .filter(g => isComplet || g.essentiel)
    .map(g => {
      if (!availablePieces) return g;
      const filtered = g.tools.filter(t => availablePieces.includes(t.type));
      return filtered.length > 0 ? { ...g, tools: filtered } : null;
    })
    .filter((g): g is ToolGroup => g !== null);

  // Inline tools: always visible directly in toolbar
  const inlineTools = visibleGroups.flatMap(g =>
    g.tools.filter(t => INLINE_TYPES.has(t.type))
  );

  // Groups that have popover-only tools (i.e. tools not shown inline)
  const groupsWithPopover = visibleGroups.filter(g =>
    g.tools.some(t => !INLINE_TYPES.has(t.type))
  );

  // Close popover when clicking outside
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openGroup) return;
    const handler = (e: PointerEvent) => {
      // Close if click is outside the toolbar entirely
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [openGroup]);

  // Close popover on Escape
  useEffect(() => {
    if (!openGroup) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroup(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openGroup]);

  // When a tool is selected from popover, close it
  const handleSelectTool = (tool: ToolType) => {
    setOpenGroup(null);
    onSelectTool(tool);
  };

  return (
    <>
    {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
    <div ref={toolbarRef} data-testid="toolbar" role="toolbar" aria-label="Outils de modélisation" style={{
      display: 'flex',
      padding: '0 8px',
      background: UI_SURFACE,
      borderBottom: `1px solid ${UI_BORDER}`,
      flexShrink: 0,
      alignItems: 'center',
      height: 64,
      fontSize: 13,
    }}>
      {/* Zone gauche : logo + inline tools + category buttons */}
      <div ref={toolbarScrollRef} style={{
        display: 'flex',
        padding: '0 8px',
        gap: MIN_BUTTON_GAP_PX,
        alignItems: 'center',
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        height: '100%',
        scrollbarWidth: 'none',       // Firefox
        msOverflowStyle: 'none',      // IE/Edge
      }}>
        <button
          onClick={() => setShowAbout(true)}
          aria-label="À propos de RésoMolo"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', height: '100%' }}
        >
          <Logo height={32} />
        </button>
        <div style={{ width: 1, height: 40, background: UI_BORDER, margin: '0 4px', flexShrink: 0 }} />

        {/* Inline tools with inter-group spacing */}
        {inlineTools.map((tool, i, arr) => {
          const prevType = i > 0 ? arr[i - 1].type : null;
          const isGroupStart = i > 0 && prevType !== null &&
            TOOL_GROUP_ID[tool.type] !== TOOL_GROUP_ID[prevType];
          return (
            <ToolButton
              key={tool.type}
              tool={tool}
              active={activeTool === tool.type}
              dimmed={!!dimmed && activeTool !== tool.type}
              onClick={() => onSelectTool(activeTool === tool.type ? null : tool.type)}
              extraStyle={isGroupStart ? { marginLeft: 16 } : undefined}
            />
          );
        })}

        {/* Separator between inline tools and category buttons */}
        {groupsWithPopover.length > 0 && (
          <div style={{ width: 1, height: 40, background: UI_BORDER, margin: '0 4px', flexShrink: 0 }} />
        )}

        {/* Category buttons with popovers */}
        {groupsWithPopover.map(group => {
          const popoverTools = group.tools.filter(t => !INLINE_TYPES.has(t.type));
          const hasActiveTool = group.tools.some(t => t.type === activeTool);
          const activeToolInGroup = hasActiveTool ? group.tools.find(t => t.type === activeTool) : null;
          const isOpen = openGroup === group.id;

          return (
            <div key={group.id} style={{ position: 'relative', flexShrink: 0 }}>
              <ToolGroupButton
                group={group}
                activeToolInGroup={activeToolInGroup}
                isOpen={isOpen}
                dimmed={!!dimmed}
                onClick={() => setOpenGroup(isOpen ? null : group.id)}
              />
              {isOpen && (
                <ToolGroupPopover
                  group={group}
                  tools={popoverTools}
                  activeTool={activeTool}
                  onSelectTool={(t) => handleSelectTool(activeTool === t ? null : t)}
                />
              )}
            </div>
          );
        })}

        {/* "Voir tout" — switches to Complet mode */}
        {!isComplet && (
          <button
            onClick={() => onModeChange('complet')}
            aria-label="Plus d'outils"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 8px',
              background: UI_BG,
              border: `1.5px dashed ${UI_PRIMARY}`,
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 500,
              color: UI_PRIMARY,
              minWidth: 44,
              height: 56,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: 10 }}>Voir tout</span>
          </button>
        )}
      </div>

      {/* Scroll indicator — chevron when tools overflow */}
      {hasScrollRight && (
        <button
          onClick={() => toolbarScrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' })}
          aria-label="Plus d'outils"
          style={{
            flexShrink: 0, background: 'linear-gradient(90deg, transparent, #F6F4FA 40%)',
            border: 'none', cursor: 'pointer', padding: '0 8px 0 16px', height: '100%',
            display: 'flex', alignItems: 'center', color: UI_PRIMARY, fontSize: 16,
          }}
        >
          ›
        </button>
      )}

      {/* Zone droite : Déplacer (ancré) + ModeSelector + Problèmes */}
      <div style={{
        display: 'flex',
        padding: '0 8px',
        gap: MIN_BUTTON_GAP_PX,
        alignItems: 'center',
        flexShrink: 0,
        marginLeft: MIN_BUTTON_GAP_PX,
        height: '100%',
      }}>
        <ToolButton
          tool={{ type: 'deplacer', label: 'Déplacer', Icon: DeplacerIcon }}
          active={activeTool === 'deplacer'}
          dimmed={!!dimmed && activeTool !== 'deplacer'}
          onClick={() => onSelectTool(activeTool === 'deplacer' ? null : 'deplacer')}
        />
        <div style={{ width: 1, height: 40, background: UI_BORDER, flexShrink: 0 }} />
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

// === Category group button (shows micro-icons of contained tools) ===

function ToolGroupButton({ group, activeToolInGroup, isOpen, dimmed, onClick }: {
  group: ToolGroup;
  activeToolInGroup: ToolDef | null | undefined;
  isOpen: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const hasActive = !!activeToolInGroup;
  return (
    <button
      data-testid={`group-${group.id}`}
      aria-label={group.label}
      aria-haspopup="true"
      aria-expanded={isOpen}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 6px',
        background: hasActive ? '#EDE0FA' : group.color,
        border: hasActive ? `2px solid ${UI_PRIMARY}` : isOpen ? `1.5px solid ${UI_PRIMARY}` : `1px solid ${UI_BORDER}`,
        borderRadius: 8,
        minWidth: 64,
        height: 56,
        cursor: 'pointer',
        flexShrink: 0,
        opacity: dimmed && !hasActive ? 0.5 : 1,
        transition: 'opacity 0.3s',
        position: 'relative',
      }}
    >
      {/* Always show chevron — label stays stable */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: hasActive ? UI_PRIMARY : UI_TEXT_PRIMARY }}>
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{
        fontSize: 10,
        fontWeight: 500,
        color: hasActive ? UI_PRIMARY : UI_TEXT_PRIMARY,
        whiteSpace: 'nowrap',
      }}>
        {group.label}
      </span>
      {/* Active tool indicator dot */}
      {hasActive && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: UI_PRIMARY,
        }} />
      )}
    </button>
  );
}

// === Popover showing tools within a category ===

function ToolGroupPopover({ group, tools, activeTool, onSelectTool }: {
  group: ToolGroup;
  tools: ToolDef[];
  activeTool: ToolType;
  onSelectTool: (tool: NonNullable<ToolType>) => void;
}) {
  return (
    <div
      role="menu"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 0,
        background: UI_SURFACE,
        border: `1px solid ${UI_BORDER}`,
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        zIndex: 50,
        padding: 6,
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(tools.length, 3)}, auto)`,
        gap: 4,
        animation: 'popover-slide-down 150ms ease-out',
      }}
    >
      {tools.map(tool => (
        <button
          key={tool.type}
          role="menuitem"
          data-testid={`tool-${tool.type}`}
          aria-label={tool.label}
          aria-pressed={activeTool === tool.type}
          onClick={() => onSelectTool(tool.type)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '6px 10px',
            background: activeTool === tool.type ? '#EDE0FA' : group.color + '80',
            border: activeTool === tool.type ? `2px solid ${UI_PRIMARY}` : `1px solid ${UI_BORDER}`,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            color: activeTool === tool.type ? UI_PRIMARY : UI_TEXT_PRIMARY,
            minWidth: 64,
            minHeight: 64,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <tool.Icon />
          <span>{tool.label}</span>
        </button>
      ))}
    </div>
  );
}

// === Individual tool button ===

function ToolButton({ tool, active, dimmed, onClick, extraStyle }: {
  tool: ToolDef;
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
  extraStyle?: React.CSSProperties;
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
        ...extraStyle,
      }}
    >
      <tool.Icon />
      <span>{tool.label}</span>
    </button>
  );
}
