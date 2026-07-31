import type { Edge, Node } from '@xyflow/react';

export type NodeKind = 'decision' | 'option' | 'outcome';

export type Feeling = -2 | -1 | 0 | 1 | 2;

export interface Verdict {
  winnerLabel: string;
  score: number;
  /** how far ahead of the runner-up, in the grid's own score units */
  margin: number;
}

export interface TreeNodeData {
  label: string;
  kind: NodeKind;
  /** the user's reasoning — a node is "resolved" once this has content */
  note: string;
  feeling?: Feeling;
  /** 0-100, how likely this outcome feels */
  likelihood?: number;
  gridId?: string;
  verdict?: Verdict;
  /** marks this node as part of the path the user is leaning toward */
  chosen?: boolean;
  [key: string]: unknown;
}

export type TreeNode = Node<TreeNodeData, 'thought'>;
export type TreeEdge = Edge;

export interface Criterion {
  id: string;
  label: string;
  /** 1-10, how much this matters */
  weight: number;
}

export interface GridOption {
  id: string;
  label: string;
  /** tree node this option was promoted to / came from */
  nodeId?: string;
}

export interface Cell {
  /** -3 (strong con) … +3 (strong pro) */
  score: number;
  note: string;
}

export type GridMode = 'simple' | 'weighted';

export interface Grid {
  id: string;
  /** tree node that owns this comparison */
  nodeId: string;
  title: string;
  criteria: Criterion[];
  options: GridOption[];
  /** keyed `${optionId}:${criterionId}` */
  cells: Record<string, Cell>;
  mode: GridMode;
}

export interface DecisionDoc {
  id: string;
  version: 1;
  question: string;
  createdAt: string;
  updatedAt: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  grids: Record<string, Grid>;
}

export const cellKey = (optionId: string, criterionId: string) => `${optionId}:${criterionId}`;

export const isResolved = (data: TreeNodeData) => data.note.trim().length > 0;

export const KIND_LABEL: Record<NodeKind, string> = {
  decision: 'Decision',
  option: 'Option',
  outcome: 'Outcome',
};
