import type { ArbreLevel } from '../model/types';
import {
  ARBRE_LEVEL_GAP_MM, ARBRE_NODE_W_MM, ARBRE_NODE_H_MM,
  ARBRE_SIBLING_GAP_MM, ARBRE_MAX_LEAVES, ARBRE_WARN_LEAVES,
} from '../model/types';

// === Tree layout types ===

export interface TreeNode {
  levelIndex: number;
  optionIndex: number;     // index within this level's options
  parentPathIndex: number; // index among all nodes at this level (flattened)
  label: string;
  x: number;  // center x, mm relative to piece origin
  y: number;  // center y, mm relative to piece origin
}

export interface TreeBranch {
  fromIndex: number; // index into nodes[]
  toIndex: number;
  x1: number; y1: number; // bottom of parent node
  x2: number; y2: number; // top of child node
}

export interface TreeLayout {
  nodes: TreeNode[];
  branches: TreeBranch[];
  leafCount: number;
  width: number;
  height: number;
  warning: string | null; // non-judgmental warning if leafCount > WARN threshold
  capped: boolean;        // true if tree was capped at MAX_LEAVES
}

// === Layout computation ===

/**
 * Compute a top-down tree layout from declarative levels.
 *
 * Each level has N options. The tree is combinatorial: every node at level i
 * fans out to ALL options of level i+1. For levels [{A,B}, {1,2,3}],
 * the tree has 2 nodes at L0, each with 3 children at L1 = 6 leaf nodes.
 *
 * @param levels The tree structure (name + options per level)
 * @param siblingGap Optional override for horizontal gap between siblings (mm)
 */
export function computeTreeLayout(
  levels: ArbreLevel[],
  siblingGap: number = ARBRE_SIBLING_GAP_MM,
): TreeLayout {
  if (levels.length === 0) {
    return { nodes: [], branches: [], leafCount: 0, width: 0, height: 0, warning: null, capped: false };
  }

  // Compute leaf count (product of all option counts)
  let leafCount = 1;
  let capped = false;
  for (const level of levels) {
    leafCount *= Math.max(1, level.options.length);
  }
  if (leafCount > ARBRE_MAX_LEAVES) {
    capped = true;
    leafCount = ARBRE_MAX_LEAVES;
  }

  const warning = leafCount >= ARBRE_WARN_LEAVES
    ? `Ton arbre a ${leafCount} feuilles. C'est beaucoup!`
    : null;

  const nodeW = ARBRE_NODE_W_MM;
  const nodeH = ARBRE_NODE_H_MM;
  const levelGap = ARBRE_LEVEL_GAP_MM;
  const cellW = nodeW + siblingGap;

  // Total width based on leaf count
  const width = Math.max(nodeW, leafCount * cellW - siblingGap);
  const height = (levels.length - 1) * levelGap + nodeH;

  const nodes: TreeNode[] = [];
  const branches: TreeBranch[] = [];

  // Build nodes level by level
  // At each level, the number of nodes = product of options[0..levelIndex]
  // Each node's horizontal span = width / nodesAtThisLevel
  for (let li = 0; li < levels.length; li++) {
    const level = levels[li];
    const options = level.options.length > 0 ? level.options : ['?'];

    // Number of "parent paths" reaching this level
    let parentPaths = 1;
    for (let k = 0; k < li; k++) {
      parentPaths *= Math.max(1, levels[k].options.length);
    }

    const nodesAtLevel = parentPaths * options.length;
    const spanPerNode = width / nodesAtLevel;
    const y = li * levelGap + nodeH / 2;

    let leafNodesAdded = 0;
    for (let pi = 0; pi < parentPaths; pi++) {
      if (capped && li === levels.length - 1 && leafNodesAdded >= leafCount) break;
      for (let oi = 0; oi < options.length; oi++) {
        if (capped && li === levels.length - 1 && leafNodesAdded >= leafCount) break;
        const flatIndex = pi * options.length + oi;

        const x = spanPerNode * flatIndex + spanPerNode / 2;
        const nodeIndex = nodes.length;

        nodes.push({
          levelIndex: li,
          optionIndex: oi,
          parentPathIndex: flatIndex,
          label: options[oi],
          x,
          y,
        });

        // Create branch from parent
        if (li > 0) {
          // Parent is at level li-1, parentPath pi
          const parentFlatIndex = pi; // pi is the parent path index
          const parentNode = nodes.find(
            n => n.levelIndex === li - 1 && n.parentPathIndex === parentFlatIndex,
          );
          if (parentNode) {
            branches.push({
              fromIndex: nodes.indexOf(parentNode),
              toIndex: nodeIndex,
              x1: parentNode.x,
              y1: parentNode.y + nodeH / 2,
              x2: x,
              y2: y - nodeH / 2,
            });
          }
        }
        if (li === levels.length - 1) leafNodesAdded++;
      }
    }
  }

  // Recalculate width based on actual max nodes at any level
  const nodesPerLevel = new Map<number, number>();
  for (const n of nodes) {
    nodesPerLevel.set(n.levelIndex, (nodesPerLevel.get(n.levelIndex) ?? 0) + 1);
  }
  const maxNodesAtAnyLevel = Math.max(1, ...nodesPerLevel.values());
  const actualWidth = Math.max(nodeW, maxNodesAtAnyLevel * cellW - siblingGap);

  // Reposition nodes to use actual width
  for (let li = 0; li < levels.length; li++) {
    const levelNodes = nodes.filter(n => n.levelIndex === li);
    const count = levelNodes.length;
    if (count === 0) continue;
    const span = actualWidth / count;
    levelNodes.forEach((n, i) => { n.x = span * i + span / 2; });
  }

  // Recalculate branch endpoints after repositioning
  for (const b of branches) {
    const from = nodes[b.fromIndex];
    const to = nodes[b.toIndex];
    if (from && to) {
      b.x1 = from.x;
      b.y1 = from.y + nodeH / 2;
      b.x2 = to.x;
      b.y2 = to.y - nodeH / 2;
    }
  }

  return { nodes, branches, leafCount, width: actualWidth, height, warning, capped };
}

// === "Brancher pareil" helper ===

/**
 * Check if "branch same" is available for a given level.
 * Returns true only if:
 * 1. There are at least 2 parent paths reaching levelIndex
 * 2. At least one parent has a complete set of children
 * 3. Not all parents already have the same children (would be a no-op)
 */
export function canBranchSame(levels: ArbreLevel[], levelIndex: number): boolean {
  if (levelIndex < 1 || levelIndex >= levels.length) return false;

  // All parents fan out to the same options list by definition in our model
  // (levels[levelIndex].options is shared). So "branch same" means:
  // the structure is already uniform — this is always true in our data model.
  // The feature becomes useful when we extend to per-parent options (v2).
  // For now, return false (feature not applicable with shared options model).
  return false;
}
