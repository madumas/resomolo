import type { Arbre } from '../../model/types';
import { ARBRE_NODE_W_MM, ARBRE_NODE_H_MM } from '../../model/types';
import { computeTreeLayout } from '../../engine/arbre-layout';

// TODO v2: WAI-ARIA TreeView keyboard navigation (tabindex + aria-activedescendant)
// Ref: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/

interface ArbrePieceProps {
  piece: Arbre;
  isSelected: boolean;
  textScale?: number;
}

export function ArbrePiece({ piece, isSelected, textScale = 1 }: ArbrePieceProps) {
  const ts = textScale;
  const layout = computeTreeLayout(piece.levels);
  const { nodes, branches, leafCount, width, height, warning } = layout;
  const { x, y } = piece;
  const nw = ARBRE_NODE_W_MM;
  const nh = ARBRE_NODE_H_MM;

  if (nodes.length === 0) {
    return (
      <g>
        <text x={x} y={y + 8} fontSize={6} fill="#55506A">
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
        return (
          <g key={`n-${i}`}>
            <rect x={nx} y={ny} width={nw} height={nh} rx={2.5}
              fill={isLeaf ? 'rgba(24, 95, 165, 0.12)' : 'rgba(85, 80, 106, 0.08)'}
              stroke={isLeaf ? '#185FA5' : '#55506A'}
              strokeWidth={0.6} />
            <text x={x + node.x} y={y + node.y + 1}
              textAnchor="middle" dominantBaseline="central"
              fontSize={Math.min(7, nw / Math.max(1, node.label.length) * 1.4) * ts}
              fill="#1E1A2E" fontWeight={600}>
              {node.label}
            </text>
          </g>
        );
      })}

      {/* Level names on the left */}
      {piece.levels.map((level, li) => {
        const firstNode = nodes.find(n => n.levelIndex === li);
        if (!firstNode) return null;
        return (
          <text key={`lvl-${li}`}
            x={x - 6} y={y + firstNode.y + 1}
            textAnchor="end" dominantBaseline="central"
            fontSize={5 * ts} fill="#55506A" fontWeight={500}>
            {level.name}
          </text>
        );
      })}

      {/* [+] add level button below the last level — always visible (R8) */}
      {(() => {
        const lastLevelNodes = nodes.filter(n => n.levelIndex === piece.levels.length - 1);
        if (lastLevelNodes.length === 0) return null;
        const btnY = y + lastLevelNodes[0].y + nh / 2 + 8;
        return (
          <g opacity={isSelected ? 1 : 0.4}
            data-arbre-action="add-level" style={{ cursor: 'pointer' }}>
            <rect x={x + width / 2 - 12} y={btnY} width={24} height={10} rx={3}
              fill="#EDE0FA" stroke="#7028e0" strokeWidth={0.5} />
            <text x={x + width / 2} y={btnY + 5.5}
              textAnchor="middle" dominantBaseline="central"
              fontSize={5 * ts} fill="#7028e0" fontWeight={600}>
              + Niveau
            </text>
          </g>
        );
      })()}

      {/* [+] add option buttons on each level — always visible (R8) */}
      {piece.levels.map((_level, li) => {
        const levelNodes = nodes.filter(n => n.levelIndex === li);
        if (levelNodes.length === 0) return null;
        const lastNode = levelNodes[levelNodes.length - 1];
        const btnX = x + lastNode.x + nw / 2 + 4;
        const btnCY = y + lastNode.y;
        return (
          <g key={`add-opt-${li}`} opacity={isSelected ? 1 : 0.4}
            data-arbre-action="add-option" data-level-index={li}
            style={{ cursor: 'pointer' }}>
            <circle cx={btnX + 5} cy={btnCY} r={5}
              fill="#EDE0FA" stroke="#7028e0" strokeWidth={0.5} />
            <text x={btnX + 5} y={btnCY + 0.5}
              textAnchor="middle" dominantBaseline="central"
              fontSize={7} fill="#7028e0" fontWeight={700}>
              +
            </text>
          </g>
        );
      })}

      {/* Leaf counter — always visible */}
      <text x={x + width} y={y + height + 10}
        textAnchor="end" fontSize={5 * ts} fill="#55506A">
        {leafCount} {leafCount === 1 ? 'feuille' : 'feuilles'}
      </text>

      {/* Warning if too many leaves (R5) */}
      {warning && (
        <text x={x + width / 2} y={y + height + 18}
          textAnchor="middle" fontSize={5} fill="#B8860B">
          {warning}
        </text>
      )}
    </g>
  );
}
