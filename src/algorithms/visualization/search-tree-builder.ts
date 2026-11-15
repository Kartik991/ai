import type { SearchTreeNode } from '../../types/index.ts';

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    node: SearchTreeNode;
    isCurrent?: boolean;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: Record<string, string | number>;
}

/**
 * Builds React Flow nodes and edges with a tree layout algorithm.
 */
export function buildReactFlowTree(
  treeNodes: SearchTreeNode[],
  currentNodeId?: string
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  if (treeNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodeMap = new Map<string, SearchTreeNode>();
  treeNodes.forEach((n) => nodeMap.set(n.id, n));

  // Find root nodes (no parent or parent not found)
  const rootNodes = treeNodes.filter((n) => !n.parentId || !nodeMap.has(n.parentId));

  const HORIZONTAL_SPACING = 180;
  const VERTICAL_SPACING = 110;

  // Track horizontal position per depth level to avoid overlapping
  const levelPositions = new Map<number, number>();
  const calculatedPositions = new Map<string, { x: number; y: number }>();

  function layoutSubtree(nodeId: string, depth: number): number {
    const node = nodeMap.get(nodeId);
    if (!node) return 0;

    const children = node.childrenIds.filter((cid) => nodeMap.has(cid));

    if (children.length === 0) {
      // Leaf node: place at the next available horizontal slot for this depth
      const currentLevelX = levelPositions.get(depth) || 0;
      const x = currentLevelX;
      levelPositions.set(depth, currentLevelX + HORIZONTAL_SPACING);
      calculatedPositions.set(nodeId, { x, y: depth * VERTICAL_SPACING });
      return x;
    }

    // Interior node: layout children first, then center over children
    const childXPositions: number[] = [];
    for (const childId of children) {
      const childX = layoutSubtree(childId, depth + 1);
      childXPositions.push(childX);
    }

    const minChildX = Math.min(...childXPositions);
    const maxChildX = Math.max(...childXPositions);
    let x = (minChildX + maxChildX) / 2;

    // Ensure it doesn't overlap previous siblings at this depth
    const currentLevelX = levelPositions.get(depth) || 0;
    if (x < currentLevelX) {
      const shift = currentLevelX - x;
      x = currentLevelX;
      // Shift all descendants
      shiftSubtree(nodeId, shift);
    }

    levelPositions.set(depth, x + HORIZONTAL_SPACING);
    calculatedPositions.set(nodeId, { x, y: depth * VERTICAL_SPACING });
    return x;
  }

  function shiftSubtree(nodeId: string, shift: number): void {
    const pos = calculatedPositions.get(nodeId);
    if (pos) {
      pos.x += shift;
    }
    const node = nodeMap.get(nodeId);
    if (node) {
      node.childrenIds.forEach((cid) => shiftSubtree(cid, shift));
    }
  }

  // Layout all subtrees
  rootNodes.forEach((root) => {
    layoutSubtree(root.id, 0);
  });

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  treeNodes.forEach((n) => {
    const pos = calculatedPositions.get(n.id) || { x: 0, y: n.depth * VERTICAL_SPACING };
    nodes.push({
      id: n.id,
      type: 'cspTreeNode',
      position: pos,
      data: {
        node: n,
        isCurrent: n.id === currentNodeId,
      },
    });

    if (n.parentId && nodeMap.has(n.parentId)) {
      edges.push({
        id: `e-${n.parentId}-${n.id}`,
        source: n.parentId,
        target: n.id,
        animated: n.status === 'exploring',
        style: {
          stroke:
            n.status === 'success'
              ? '#10b981'
              : n.status === 'failed' || n.status === 'backtracked'
              ? '#ef4444'
              : '#94a3b8',
          strokeWidth: 2,
        },
      });
    }
  });

  return { nodes, edges };
}
