import type { Arbre } from '../../model/types';
import { ARBRE_NODE_W_MM, ARBRE_NODE_H_MM, ARBRE_MAX_LEAVES, ARBRE_MAX_LEAVES_COMPLET, ARBRE_SIBLING_GAP_MM } from '../../model/types';
import { computeTreeLayout } from '../../engine/arbre-layout';

// TODO v2: WAI-ARIA TreeView keyboard navigation (tabindex + aria-activedescendant)
// Ref: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/

// SVG font tiers (mm) — harmonized across all pieces
const T1 = 7;   // content: node labels
const T2 = 6;   // labels: level names, leaf counter

interface ArbrePieceProps {
  piece: Arbre;
  isSelected: boolean;
  textScale?: number;
  toolbarMode?: 'essentiel' | 'complet';
}

export function ArbrePiece({ piece, isSelected, textScale = 1, toolbarMode = 'essentiel' }: ArbrePieceProps) {
  const ts = textScale;
  const maxLeaves = toolbarMode === 'complet' ? ARBRE_MAX_LEAVES_COMPLET : ARBRE_MAX_LEAVES;
  const layout = computeTreeLayout(piece.levels, ARBRE_SIBLING_GAP_MM, maxLeaves);
  const { nodes, branches, leafCount, width, height, warning, sizeMultiplier } = layout;
  const { x, y } = piece;
  const nw = ARBRE_NODE_W_MM * sizeMultiplier;
  const nh = ARBRE_NODE_H_MM;

  if (nodes.length === 0) {
    return (
      <g>
        <text x={x} y={y + 8} fontSize={T2 * ts} fill="#55506A">
          Arbre vide — ajouter un niveau
        </text>
      </g>
    );
  }

  return (
    <g>
      {/* Selection highlight */}
      {isSelected && (
        <rect x={x - 3} y={y - 3} width={width + 6} height={height + 6} rx={3}
          fill="rgba(112, 40, 224, 0.06)" stroke="#7028e0" strokeWidth={1} />
      )}

      {/* Branches */}
      {branches.map((b, i) => (
        <line key={`b-${i}`}
          x1={x + b.x1} y1={y + b.y1}
          x2={x + b.x2} y2={y + b.y2}
          stroke="#55506A" strokeWidth={0.8} />
      ))}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const nx = x + node.x - nw / 2;
        const ny = y + node.y - nh / 2;
        const isLeaf = node.levelIndex === piece.levels.length - 1;
        const isEmpty = !node.label;
        const displayLabel = isEmpty ? '...' : node.label;
        return (
          <g key={`n-${i}`} style={isSelected ? { cursor: 'text' } : undefined}>
            {/* Invisible hit area — enlarged by 4mm padding for TDC accessibility */}
            {isSelected && (
              <rect x={nx - 4} y={ny - 4} width={nw + 8} height={nh + 8}
                fill="transparent" />
            )}
            <rect x={nx} y={ny} width={nw} height={nh} rx={2.5}
              fill={isLeaf ? 'rgba(24, 95, 165, 0.12)' : 'rgba(85, 80, 106, 0.08)'}
              stroke={isLeaf ? '#185FA5' : '#55506A'}
              strokeWidth={0.6}
              strokeDasharray={isEmpty ? '3 2' : undefined}
              data-edit-target={`${piece.id}-node-${i}`} />
            <text x={x + node.x} y={y + node.y + 1}
              textAnchor="middle" dominantBaseline="central"
              fontSize={Math.min(T1 * sizeMultiplier, nw / Math.max(1, displayLabel.length) * 1.4) * ts}
              fill={isEmpty ? '#B0A8C0' : '#1E1A2E'}
              fontWeight={isEmpty ? 400 : 600}
              opacity={isEmpty ? 0.65 : 1}
              pointerEvents="none">
              {displayLabel}
            </text>
          </g>
        );
      })}

      {/* Level names on the left */}
      {piece.levels.map((level, li) => {
        const firstNode = nodes.find(n => n.levelIndex === li);
        if (!firstNode) return null;
        const nameEmpty = !level.name;
        const displayName = nameEmpty ? 'Nom du choix' : level.name;
        return (
          <g key={`lvl-${li}`} style={isSelected ? { cursor: 'text' } : undefined}>
            <text
              x={x - 6} y={y + firstNode.y + 1}
              textAnchor="end" dominantBaseline="central"
              fontSize={T2 * ts}
              fill={nameEmpty ? '#B0A8C0' : '#55506A'}
              fontWeight={500}
              opacity={nameEmpty ? 0.5 : 1}
              data-edit-target={`${piece.id}-level-${li}`}>
              {displayName}
            </text>
          </g>
        );
      })}

      {/* Structure buttons removed — all structural actions via context menu */}

      {/* Leaf counter — always visible */}
      <text x={x + width} y={y + height + 10}
        textAnchor="end" fontSize={T2 * ts} fill="#55506A">
        {leafCount} {leafCount === 1 ? 'feuille' : 'feuilles'}
      </text>

      {/* Warning if too many leaves (R5) */}
      {warning && (
        <text x={x + width / 2} y={y + height + 18}
          textAnchor="middle" fontSize={T2 * ts} fill="#B8860B">
          {warning}
        </text>
      )}
    </g>
  );
}
