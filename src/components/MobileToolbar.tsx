import { useState } from 'react';
import type { ToolType, ToolbarMode } from '../model/types';
import { UI_BORDER, UI_SURFACE, UI_PRIMARY, UI_TEXT_PRIMARY } from '../config/theme';
import { TOOL_GROUPS } from './Toolbar';
import { DeplacerIcon } from './ToolIcons';

interface MobileToolbarProps {
  activeTool: ToolType;
  toolbarMode: ToolbarMode;
  onSelectTool: (tool: ToolType) => void;
  dimmed?: boolean;
  availablePieces?: string[] | null;
}

// Essential tools shown directly in the bottom bar (3 most-used: jeton, barre, calcul)
// Réponse/inconnue moved to drawer — calcul is multi-use, réponse is once per problem
const MOBILE_INLINE_TYPES = new Set(['jeton', 'barre', 'calcul']);

export function MobileToolbar({ activeTool, toolbarMode, onSelectTool, dimmed, availablePieces }: MobileToolbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isComplet = toolbarMode === 'complet';

  // All tools from visible groups
  const allTools = TOOL_GROUPS
    .filter(g => isComplet || g.essentiel)
    .flatMap(g => g.tools)
    .filter(t => !availablePieces || availablePieces.includes(t.type));

  // Bottom bar: essential inline tools + Déplacer
  const barTools = allTools.filter(t => MOBILE_INLINE_TYPES.has(t.type));

  // Drawer: all tools organized by group
  const drawerGroups = TOOL_GROUPS
    .filter(g => isComplet || g.essentiel)
    .map(g => ({
      ...g,
      tools: g.tools.filter(t => !availablePieces || availablePieces.includes(t.type)),
    }))
    .filter(g => g.tools.length > 0);

  return (
    <>
      {/* Drawer overlay + panel */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 45,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.3)',
            }}
          />
          {/* Panel */}
          <div style={{
            background: UI_SURFACE,
            borderRadius: '16px 16px 0 0',
            maxHeight: '50vh',
            overflowY: 'auto',
            padding: '12px 16px 80px',
            animation: 'mobile-drawer-up 200ms ease-out',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#D5D0E0' }} />
            </div>

            {/* Tool groups */}
            {drawerGroups.map(group => (
              <div key={group.id} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: UI_TEXT_PRIMARY,
                  marginBottom: 8,
                  paddingLeft: 4,
                }}>
                  {group.label}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                }}>
                  {group.tools.map(tool => (
                    <button
                      key={tool.type}
                      data-testid={`tool-${tool.type}`}
                      aria-label={tool.label}
                      aria-pressed={activeTool === tool.type}
                      onClick={() => {
                        onSelectTool(activeTool === tool.type ? null : tool.type);
                        setDrawerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        padding: 6,
                        background: activeTool === tool.type ? '#EDE0FA' : group.color + '80',
                        border: activeTool === tool.type ? `2px solid ${UI_PRIMARY}` : `1px solid ${UI_BORDER}`,
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                        color: activeTool === tool.type ? UI_PRIMARY : UI_TEXT_PRIMARY,
                        minHeight: 64,
                        cursor: 'pointer',
                      }}
                    >
                      <tool.Icon />
                      <span>{tool.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div
        data-testid="mobile-toolbar"
        role="toolbar"
        aria-label="Outils de modélisation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '4px 8px',
          height: 64,
          background: UI_SURFACE,
          borderTop: `1px solid ${UI_BORDER}`,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {barTools.map(tool => (
          <button
            key={tool.type}
            data-testid={`tool-${tool.type}`}
            aria-label={tool.label}
            aria-pressed={activeTool === tool.type}
            onClick={() => onSelectTool(activeTool === tool.type ? null : tool.type)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              padding: '4px 6px',
              background: activeTool === tool.type ? '#EDE0FA' : 'transparent',
              border: activeTool === tool.type ? `2px solid ${UI_PRIMARY}` : '1px solid transparent',
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 500,
              color: activeTool === tool.type ? UI_PRIMARY : UI_TEXT_PRIMARY,
              minWidth: 56,
              height: 56,
              opacity: dimmed && activeTool !== tool.type ? 0.5 : 1,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <tool.Icon />
            <span>{tool.label}</span>
          </button>
        ))}

        {/* "Voir tout" drawer toggle */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          aria-label="Plus d'outils"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            padding: '4px 6px',
            background: drawerOpen ? '#EDE0FA' : 'transparent',
            border: drawerOpen ? `2px solid ${UI_PRIMARY}` : '1px solid transparent',
            borderRadius: 8,
            fontSize: 10,
            fontWeight: 500,
            color: UI_PRIMARY,
            minWidth: 48,
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
          <span>Tout</span>
        </button>

        {/* Déplacer */}
        <button
          data-testid="tool-deplacer"
          aria-label="Déplacer"
          aria-pressed={activeTool === 'deplacer'}
          onClick={() => onSelectTool(activeTool === 'deplacer' ? null : 'deplacer')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            padding: '4px 6px',
            background: activeTool === 'deplacer' ? '#EDE0FA' : 'transparent',
            border: activeTool === 'deplacer' ? `2px solid ${UI_PRIMARY}` : '1px solid transparent',
            borderRadius: 8,
            fontSize: 10,
            fontWeight: 500,
            color: activeTool === 'deplacer' ? UI_PRIMARY : UI_TEXT_PRIMARY,
            minWidth: 48,
            height: 56,
            opacity: dimmed && activeTool !== 'deplacer' ? 0.5 : 1,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <DeplacerIcon />
          <span>Déplacer</span>
        </button>
      </div>
    </>
  );
}
