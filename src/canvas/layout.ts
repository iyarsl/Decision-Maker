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

/**
 * Lay the whole map out on one grid: a column per depth, siblings stacked a row apart,
 * every parent centred on the children it leads to. Loose cards keep their own column
 * of trees below the main one. Sibling order follows where the user already had them.
 */
export function tidyTree(nodes: TreeNode[], edges: { source: string; target: string }[]): TreeNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const order = new Map(nodes.map((node, index) => [node.id, index]));
  const children = new Map<string, string[]>();
  const parented = new Set<string>();

  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target) || parented.has(edge.target)) continue;
    children.set(edge.source, [...(children.get(edge.source) ?? []), edge.target]);
    parented.add(edge.target);
  }

  for (const kids of children.values()) {
    kids.sort(
      (a, b) =>
        byId.get(a)!.position.y - byId.get(b)!.position.y || order.get(a)! - order.get(b)!,
    );
  }

  const placed = new Map<string, { x: number; y: number }>();
  const seen = new Set<string>();
  let cursor = 0;

  const place = (id: string, depth: number): number => {
    seen.add(id);
    const x = depth * (NODE_WIDTH + COLUMN_GAP);
    const kids = (children.get(id) ?? []).filter((kid) => !seen.has(kid));
    if (kids.length === 0) {
      const y = cursor;
      cursor += stride;
      placed.set(id, { x, y });
      return y;
    }
    const ys = kids.map((kid) => place(kid, depth + 1));
    const y = (ys[0] + ys[ys.length - 1]) / 2;
    placed.set(id, { x, y });
    return y;
  };

  nodes
    .filter((node) => !parented.has(node.id))
    .forEach((root, index) => {
      if (index > 0) cursor += stride;
      place(root.id, 0);
    });

  // anything left over sat in a cycle — leave it where it is rather than guessing
  return nodes.map((node) => (placed.has(node.id) ? { ...node, position: placed.get(node.id)! } : node));
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
