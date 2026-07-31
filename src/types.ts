import type { Edge, Node } from '@xyflow/react';

export type NodeKind = 'decision' | 'option' | 'outcome';

export type Feeling = -2 | -1 | 0 | 1 | 2;

export interface Verdict {
  winnerLabel: string;
  score: number;
  /** how far ahead of the runner-up, in the grid's own score units */
  margin: number;
}

export type Side = 'pro' | 'con';

/** what answers a line: the con that comes straight back at a pro, or the other way round */
export interface Counter {
  id: string;
  text: string;
  /** 1 … 5, optional like the line it answers. Taken off what that line counts. */
  weight?: number;
}

/** one thing for or against a single branch, and how much it counts */
export interface LedgerItem {
  id: string;
  side: Side;
  text: string;
  /** 1 (minor) … 5 (decisive). Optional: an unrated line still counts, as one. */
  weight?: number;
  counters?: Counter[];
}

export interface TreeNodeData {
  label: string;
  kind: NodeKind;
  /** the user's reasoning — a node is "resolved" once this has content */
  note: string;
  feeling?: Feeling;
  /** 0-100, how likely this outcome feels */
  likelihood?: number;
  /** what's for and against this branch — its own, not shared with its siblings */
  ledger?: LedgerItem[];
  verdict?: Verdict;
  /** marks this node as part of the path the user is leaning toward */
  chosen?: boolean;
  [key: string]: unknown;
}

export type TreeNode = Node<TreeNodeData, 'thought'>;
export type TreeEdge = Edge;

export const DOC_VERSION = 2;

export interface DecisionDoc {
  id: string;
  version: typeof DOC_VERSION;
  question: string;
  createdAt: string;
  updatedAt: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
}

/**
 * A branch is clear once you have written why it is there. A **decision** card is the
 * exception: it is a fork, not a claim — the thinking that answers it lives on the
 * branches under it, so it is never the thing left in the fog.
 */
export const isResolved = (data: TreeNodeData) =>
  data.kind === 'decision' || data.note.trim().length > 0;

export const KIND_LABEL: Record<NodeKind, string> = {
  decision: 'Decision',
  option: 'Option',
  outcome: 'Outcome',
};
