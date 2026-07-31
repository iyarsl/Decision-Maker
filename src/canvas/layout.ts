import type { TreeNode } from '../types';

export const NODE_WIDTH = 252;
export const NODE_HEIGHT = 132;
export const COLUMN_GAP = 108;
export const ROW_GAP = 34;

const stride = NODE_HEIGHT + ROW_GAP;

const columnX = (parent: TreeNode) => parent.position.x + NODE_WIDTH + COLUMN_GAP;

/** true while a fan still sits in one evenly spaced column — i.e. the user hasn't rearranged it */
export function isTidyFan(parent: TreeNode, siblings: TreeNode[]): boolean {
  if (siblings.length < 2) return true;
  const x = columnX(parent);
  const sorted = [...siblings].sort((a, b) => a.position.y - b.position.y);
  return sorted.every(
    (node, index) =>
      Math.abs(node.position.x - x) < 1 &&
      Math.abs(node.position.y - (sorted[0].position.y + index * stride)) < 1,
  );
}

/**
 * Where a new branch goes: the next slot below its siblings, in the parent's next column.
 * Any number of branches is fine — they stack, they never overlap.
 */
export function childPosition(parent: TreeNode, siblings: TreeNode[]): { x: number; y: number } {
  const x = columnX(parent);
  if (siblings.length === 0) return { x, y: parent.position.y };
  const lowest = Math.max(...siblings.map((s) => s.position.y));
  return { x, y: lowest + stride };
}

/** re-centre a whole fan of siblings on its parent, keeping the column aligned */
export function tidyFan(parent: TreeNode, siblings: TreeNode[]): TreeNode[] {
  const x = columnX(parent);
  const height = (siblings.length - 1) * stride;
  const top = parent.position.y - height / 2;
  const order = [...siblings].sort((a, b) => a.position.y - b.position.y);
  const placed = new Map(order.map((node, index) => [node.id, { x, y: top + index * stride }]));
  return siblings.map((node) => ({ ...node, position: placed.get(node.id) ?? node.position }));
}

/** nudge a dropped node until it isn't sitting on top of another one */
export function freePosition(
  position: { x: number; y: number },
  nodes: TreeNode[],
): { x: number; y: number } {
  let candidate = { ...position };
  let guard = 0;
  while (guard++ < 40) {
    const clash = nodes.some(
      (node) =>
        Math.abs(node.position.x - candidate.x) < NODE_WIDTH * 0.7 &&
        Math.abs(node.position.y - candidate.y) < NODE_HEIGHT * 0.7,
    );
    if (!clash) break;
    candidate = { x: candidate.x + 28, y: candidate.y + stride * 0.6 };
  }
  return candidate;
}
