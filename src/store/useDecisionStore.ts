import {
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DOC_VERSION,
  isResolved,
  type Counter,
  type DecisionDoc,
  type LedgerItem,
  type NodeKind,
  type Side,
  type TreeEdge,
  type TreeNode,
  type TreeNodeData,
} from '../types';
import { childPosition, freePosition, isTidyFan, tidyFan, tidyTree } from '../canvas/layout';
import { compareBranches, MAX_WEIGHT, MIN_WEIGHT } from './scoring';
import { migrateDoc } from './io';

export const STORAGE_KEY = 'decision-maker:v1';

const id = () => nanoid(8);
const now = () => new Date().toISOString();

export function createDoc(question = ''): DecisionDoc {
  const rootId = id();
  return {
    id: id(),
    version: DOC_VERSION,
    question,
    createdAt: now(),
    updatedAt: now(),
    nodes: [
      {
        id: rootId,
        type: 'thought',
        position: { x: 0, y: 0 },
        data: { label: question || 'The decision', kind: 'decision', note: '' },
      },
    ],
    edges: [],
  };
}

interface DecisionState {
  doc: DecisionDoc;
  selectedNodeId: string | null;
  /** the intersection whose branches are being compared — a ledger belongs to a node, not to itself */
  compareNodeId: string | null;
  /** the branch whose own case is open, full screen */
  weighNodeId: string | null;
  theme: 'system' | 'light' | 'dark';
  /** the one step back an undoable action leaves behind, offered for a few seconds */
  undo: { doc: DecisionDoc; label: string; at: number } | null;

  setQuestion: (question: string) => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;

  onNodesChange: (changes: NodeChange<TreeNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<TreeEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  reconnect: (oldEdge: TreeEdge, connection: Connection) => void;

  selectNode: (nodeId: string | null) => void;
  addChild: (parentId: string, kind?: NodeKind) => string;
  addLooseNode: (position: { x: number; y: number }, kind?: NodeKind) => string;
  updateNodeData: (nodeId: string, patch: Partial<TreeNodeData>) => void;
  focusNode: (nodeId: string | null) => void;
  deleteNode: (nodeId: string) => void;
  alignBranches: () => void;
  undoLast: () => void;
  dismissUndo: () => void;
  toggleChosen: (nodeId: string) => void;

  addLedgerItem: (nodeId: string, side: Side) => string;
  updateLedgerItem: (nodeId: string, itemId: string, patch: Partial<LedgerItem>) => void;
  removeLedgerItem: (nodeId: string, itemId: string) => void;

  addCounter: (nodeId: string, itemId: string) => string;
  updateCounter: (nodeId: string, itemId: string, counterId: string, patch: Partial<Counter>) => void;
  removeCounter: (nodeId: string, itemId: string, counterId: string) => void;

  openWeigh: (nodeId: string) => void;
  closeWeigh: () => void;
  openCompare: (nodeId: string) => void;
  closeCompare: () => void;

  newDoc: () => void;
  loadDoc: (doc: DecisionDoc) => void;
}

/** every mutation goes through here so `updatedAt` can never drift */
const touch = (doc: DecisionDoc, patch: Partial<DecisionDoc>): DecisionDoc => ({
  ...doc,
  ...patch,
  updatedAt: now(),
});

const patchNode = (doc: DecisionDoc, nodeId: string, patch: Partial<TreeNodeData>) =>
  touch(doc, {
    nodes: doc.nodes.map((node) =>
      node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node,
    ),
  });

const patchLedger = (
  doc: DecisionDoc,
  nodeId: string,
  change: (ledger: LedgerItem[]) => LedgerItem[],
) => {
  const node = doc.nodes.find((n) => n.id === nodeId);
  if (!node) return doc;
  return patchNode(doc, nodeId, { ledger: change(node.data.ledger ?? []) });
};

/**
 * A node and everything that hangs off it — but a branch fed by a surviving parent as
 * well stays: it was never only this one's.
 */
function subtreeIds(doc: DecisionDoc, rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const node of doc.nodes) {
      if (ids.has(node.id)) continue;
      const parents = doc.edges.filter((e) => e.target === node.id).map((e) => e.source);
      if (parents.length > 0 && parents.every((parent) => ids.has(parent))) {
        ids.add(node.id);
        added = true;
      }
    }
  }
  return ids;
}

/**
 * The rules a connection has to pass, whether it is being drawn or dragged onto a new
 * card: it has two different ends, it isn't one the map already has, and it doesn't feed
 * the decision itself — nothing comes before the question.
 */
function allowedConnection(doc: DecisionDoc, connection: Connection): boolean {
  const { source, target } = connection;
  if (!source || !target || source === target) return false;
  if (doc.nodes[0]?.id === target) return false;
  return !doc.edges.some((edge) => edge.source === source && edge.target === target);
}

export function childrenOf(doc: DecisionDoc, nodeId: string): TreeNode[] {
  const childIds = doc.edges.filter((e) => e.source === nodeId).map((e) => e.target);
  return doc.nodes.filter((n) => childIds.includes(n.id));
}

function pathToRoot(doc: DecisionDoc, nodeId: string): string[] {
  const path = [nodeId];
  let current = nodeId;
  const guard = new Set([nodeId]);
  while (true) {
    const parent = doc.edges.find((e) => e.target === current)?.source;
    if (!parent || guard.has(parent)) break;
    guard.add(parent);
    path.push(parent);
    current = parent;
  }
  return path;
}

const kindForChild = (parentKind: NodeKind): NodeKind => (parentKind === 'decision' ? 'option' : 'outcome');

/**
 * Keep React Flow's own `selected` flags in step with `selectedNodeId`. Without this the
 * two can disagree — and a click on a card React Flow already considers selected fires no
 * change event, so the panel never opens.
 */
function withSelection(nodes: TreeNode[], selectedId: string | null): TreeNode[] {
  if (nodes.every((node) => Boolean(node.selected) === (node.id === selectedId))) return nodes;
  return nodes.map((node) =>
    Boolean(node.selected) === (node.id === selectedId) ? node : { ...node, selected: node.id === selectedId },
  );
}

export const useDecisionStore = create<DecisionState>()(
  persist(
    (set, get) => ({
      doc: createDoc(),
      selectedNodeId: null,
      compareNodeId: null,
      weighNodeId: null,
      theme: 'system',
      undo: null,

      setQuestion: (question) =>
        set((state) => {
          const root = state.doc.nodes.find((n) => n.data.kind === 'decision');
          const nextDoc = touch(state.doc, { question });
          // the root node mirrors the question until the user renames it themselves
          if (root && (root.data.label === state.doc.question || root.data.label === 'The decision')) {
            return { doc: patchNode(nextDoc, root.id, { label: question || 'The decision' }) };
          }
          return { doc: nextDoc };
        }),

      setTheme: (theme) => set({ theme }),

      onNodesChange: (changes) =>
        set((state) => {
          const removals = changes.filter((c) => c.type === 'remove');
          const rest = changes.filter((c) => c.type !== 'remove');
          let doc = state.doc;
          if (rest.length) {
            doc = { ...doc, nodes: applyNodeChanges(rest, doc.nodes) };
          }
          if (removals.length) {
            // route removals through deleteNode so children and grids go too
            queueMicrotask(() => removals.forEach((c) => get().deleteNode(c.id)));
          }
          return { doc };
        }),

      onEdgesChange: (changes) =>
        set((state) => ({ doc: { ...state.doc, edges: applyEdgeChanges(changes, state.doc.edges) } })),

      onConnect: (connection) =>
        set((state) => {
          if (!allowedConnection(state.doc, connection)) return state;
          // a branch can feed as many others as it needs, and can be fed by several:
          // two options often lead to the same outcome
          return {
            doc: touch(state.doc, {
              edges: [
                ...state.doc.edges,
                { id: id(), source: connection.source, target: connection.target, type: 'thought' },
              ],
            }),
          };
        }),

      // dragging either end of an existing connection onto another card, rather than
      // deleting it and drawing a new one. Same rules as drawing one.
      reconnect: (oldEdge, connection) =>
        set((state) => {
          if (!allowedConnection(state.doc, connection)) return state;
          return {
            doc: touch(state.doc, {
              edges: reconnectEdge(oldEdge, connection, state.doc.edges),
            }),
          };
        }),

      selectNode: (nodeId) =>
        set((state) => {
          const nodes = withSelection(state.doc.nodes, nodeId);
          return {
            selectedNodeId: nodeId,
            doc: nodes === state.doc.nodes ? state.doc : { ...state.doc, nodes },
          };
        }),

      // React Flow already owns the flags here — a Ctrl-click adds to the selection, and
      // rewriting the flags from one id would throw the rest of it away
      focusNode: (nodeId) => set({ selectedNodeId: nodeId }),

      addChild: (parentId, kind) => {
        const childId = id();
        set((state) => {
          const parent = state.doc.nodes.find((n) => n.id === parentId);
          if (!parent) return state;
          const siblings = childrenOf(state.doc, parentId);
          const node: TreeNode = {
            id: childId,
            type: 'thought',
            position: childPosition(parent, siblings),
            data: {
              label: '',
              kind: kind ?? kindForChild(parent.data.kind),
              note: '',
            },
          };

          // while the fan is still in its default column, keep it centred on the parent;
          // once the user has moved a branch by hand, leave every position alone
          const fan = isTidyFan(parent, siblings) ? tidyFan(parent, [...siblings, node]) : [...siblings, node];
          const moved = new Map(fan.map((n) => [n.id, n]));
          const nodes = state.doc.nodes.map((n) => moved.get(n.id) ?? n);
          nodes.push(moved.get(childId)!);

          return {
            doc: touch(state.doc, {
              nodes: withSelection(nodes, childId),
              edges: [...state.doc.edges, { id: id(), source: parentId, target: childId, type: 'thought' }],
            }),
            selectedNodeId: childId,
          };
        });
        return childId;
      },

      addLooseNode: (position, kind = 'option') => {
        const nodeId = id();
        set((state) => ({
          doc: touch(state.doc, {
            nodes: withSelection(
              [
                ...state.doc.nodes,
                {
                  id: nodeId,
                  type: 'thought',
                  position: freePosition(position, state.doc.nodes),
                  data: { label: '', kind, note: '' },
                },
              ],
              nodeId,
            ),
          }),
          selectedNodeId: nodeId,
        }));
        return nodeId;
      },

      updateNodeData: (nodeId, patch) => set((state) => ({ doc: patchNode(state.doc, nodeId, patch) })),

      alignBranches: () =>
        set((state) => ({
          undo: { doc: state.doc, label: 'Branches aligned', at: Date.now() },
          doc: touch(state.doc, { nodes: tidyTree(state.doc.nodes, state.doc.edges) }),
        })),

      undoLast: () =>
        set((state) => (state.undo ? { doc: state.undo.doc, undo: null } : state)),

      dismissUndo: () => set({ undo: null }),

      deleteNode: (nodeId) =>
        set((state) => {
          // the decision itself stays — deleting it would leave nothing to hang branches on
          if (state.doc.nodes[0]?.id === nodeId) return state;
          const doomed = subtreeIds(state.doc, nodeId);
          const label = state.doc.nodes.find((n) => n.id === nodeId)?.data.label;
          return {
            doc: touch(state.doc, {
              nodes: state.doc.nodes.filter((n) => !doomed.has(n.id)),
              edges: state.doc.edges.filter((e) => !doomed.has(e.source) && !doomed.has(e.target)),
            }),
            selectedNodeId: state.selectedNodeId && doomed.has(state.selectedNodeId) ? null : state.selectedNodeId,
            // a comparison of branches that no longer exist has nothing left to say
            compareNodeId:
              state.compareNodeId && doomed.has(state.compareNodeId) ? null : state.compareNodeId,
            weighNodeId: state.weighNodeId && doomed.has(state.weighNodeId) ? null : state.weighNodeId,
            undo: {
              doc: state.doc,
              label: `Deleted ${label?.trim() || 'a branch'}`,
              at: Date.now(),
            },
          };
        }),

      toggleChosen: (nodeId) =>
        set((state) => {
          const wasChosen = state.doc.nodes.find((n) => n.id === nodeId)?.data.chosen;
          const path = wasChosen ? new Set<string>() : new Set(pathToRoot(state.doc, nodeId));
          return {
            doc: touch(state.doc, {
              nodes: state.doc.nodes.map((node) => ({
                ...node,
                data: { ...node.data, chosen: path.has(node.id) },
              })),
            }),
          };
        }),

      addLedgerItem: (nodeId, side) => {
        const itemId = id();
        set((state) => ({
          // no weight to begin with: rating a line is optional, and an unrated one counts as one
          doc: patchLedger(state.doc, nodeId, (ledger) => [...ledger, { id: itemId, side, text: '' }]),
        }));
        return itemId;
      },

      updateLedgerItem: (nodeId, itemId, patch) =>
        set((state) => ({
          doc: patchLedger(state.doc, nodeId, (ledger) =>
            ledger.map((item) => {
              if (item.id !== itemId) return item;
              const next = { ...item, ...patch };
              // `weight: undefined` in the patch means the user took the rating back off
              if (next.weight !== undefined) {
                next.weight = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(next.weight)));
              }
              return next;
            }),
          ),
        })),

      removeLedgerItem: (nodeId, itemId) =>
        set((state) => ({
          doc: patchLedger(state.doc, nodeId, (ledger) => ledger.filter((item) => item.id !== itemId)),
        })),

      addCounter: (nodeId, itemId) => {
        const counterId = id();
        set((state) => ({
          doc: patchLedger(state.doc, nodeId, (ledger) =>
            ledger.map((item) =>
              item.id === itemId
                ? { ...item, counters: [...(item.counters ?? []), { id: counterId, text: '' }] }
                : item,
            ),
          ),
        }));
        return counterId;
      },

      updateCounter: (nodeId, itemId, counterId, patch) =>
        set((state) => ({
          doc: patchLedger(state.doc, nodeId, (ledger) =>
            ledger.map((item) => {
              if (item.id !== itemId) return item;
              return {
                ...item,
                counters: (item.counters ?? []).map((counter) => {
                  if (counter.id !== counterId) return counter;
                  const next = { ...counter, ...patch };
                  if (next.weight !== undefined) {
                    next.weight = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(next.weight)));
                  }
                  return next;
                }),
              };
            }),
          ),
        })),

      removeCounter: (nodeId, itemId, counterId) =>
        set((state) => ({
          doc: patchLedger(state.doc, nodeId, (ledger) =>
            ledger.map((item) =>
              item.id === itemId
                ? { ...item, counters: (item.counters ?? []).filter((c) => c.id !== counterId) }
                : item,
            ),
          ),
        })),

      // the card stays selected behind the page, so closing it lands back where you were
      openWeigh: (nodeId) => set({ weighNodeId: nodeId, selectedNodeId: nodeId, compareNodeId: null }),

      closeWeigh: () => set({ weighNodeId: null }),

      openCompare: (nodeId) => set({ compareNodeId: nodeId, selectedNodeId: nodeId }),

      closeCompare: () =>
        set((state) => {
          const nodeId = state.compareNodeId;
          if (!nodeId) return { compareNodeId: null };
          const { leader, margin, tied, weighed } = compareBranches(childrenOf(state.doc, nodeId));
          // branches nobody has weighed yet shouldn't stamp a verdict on the card
          const verdict =
            leader && !tied && weighed > 0
              ? { winnerLabel: leader.label, score: leader.balance.net, margin }
              : undefined;
          return { doc: patchNode(state.doc, nodeId, { verdict }), compareNodeId: null };
        }),

      newDoc: () =>
        set({ doc: createDoc(), selectedNodeId: null, compareNodeId: null, weighNodeId: null, undo: null }),

      loadDoc: (doc) =>
        set({ doc, selectedNodeId: null, compareNodeId: null, weighNodeId: null, undo: null }),
    }),
    {
      name: STORAGE_KEY,
      version: DOC_VERSION,
      // an autosave from v1 carries a criteria grid; it becomes each branch's own ledger
      migrate: (persisted) => {
        const state = persisted as { doc?: unknown; theme?: 'system' | 'light' | 'dark' };
        try {
          return { ...state, doc: migrateDoc(state?.doc) };
        } catch {
          // a save we cannot read is worse than a blank canvas only if it takes the app down with it
          return { ...state, doc: createDoc() };
        }
      },
      // selection and drag are view state: restoring them leaves React Flow's idea of
      // what is selected fighting the store's, which loops on the next render
      partialize: (state) => ({
        doc: {
          ...state.doc,
          nodes: state.doc.nodes.map((node) => ({ ...node, selected: false, dragging: false })),
        },
        theme: state.theme,
      }),
    },
  ),
);

/** share of nodes the user has actually written their reasoning into */
export function selectClarity(nodes: TreeNode[]) {
  const total = nodes.length;
  const resolved = nodes.filter((n) => isResolved(n.data)).length;
  return { total, resolved, ratio: total === 0 ? 0 : resolved / total };
}
