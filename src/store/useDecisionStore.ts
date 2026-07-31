import { applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react';
import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  cellKey,
  isResolved,
  type Cell,
  type Criterion,
  type DecisionDoc,
  type Grid,
  type GridMode,
  type GridOption,
  type NodeKind,
  type TreeEdge,
  type TreeNode,
  type TreeNodeData,
} from '../types';
import { childPosition, freePosition, isTidyFan, tidyFan } from '../canvas/layout';
import { MAX_WEIGHT, MIN_WEIGHT, scoreGrid } from './scoring';

export const STORAGE_KEY = 'decision-maker:v1';

const id = () => nanoid(8);
const now = () => new Date().toISOString();

const DEFAULT_CRITERIA = ['What it costs me', 'What it gives me', 'How it feels in a year'];

export function createDoc(question = ''): DecisionDoc {
  const rootId = id();
  return {
    id: id(),
    version: 1,
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
    grids: {},
  };
}

interface DecisionState {
  doc: DecisionDoc;
  selectedNodeId: string | null;
  openGridId: string | null;
  theme: 'system' | 'light' | 'dark';

  setQuestion: (question: string) => void;
  setTheme: (theme: 'system' | 'light' | 'dark') => void;

  onNodesChange: (changes: NodeChange<TreeNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<TreeEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  selectNode: (nodeId: string | null) => void;
  addChild: (parentId: string, kind?: NodeKind) => string;
  addLooseNode: (position: { x: number; y: number }, kind?: NodeKind) => string;
  updateNodeData: (nodeId: string, patch: Partial<TreeNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  toggleChosen: (nodeId: string) => void;

  openGridForNode: (nodeId: string) => string;
  closeGrid: () => void;
  setGridTitle: (gridId: string, title: string) => void;
  setGridMode: (gridId: string, mode: GridMode) => void;
  addCriterion: (gridId: string, label?: string) => void;
  updateCriterion: (gridId: string, criterionId: string, patch: Partial<Criterion>) => void;
  removeCriterion: (gridId: string, criterionId: string) => void;
  addOption: (gridId: string, label?: string) => void;
  updateOption: (gridId: string, optionId: string, patch: Partial<GridOption>) => void;
  removeOption: (gridId: string, optionId: string) => void;
  setCell: (gridId: string, optionId: string, criterionId: string, patch: Partial<Cell>) => void;
  promoteOptions: (gridId: string) => number;

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

const patchGrid = (doc: DecisionDoc, gridId: string, patch: Partial<Grid>) => {
  const grid = doc.grids[gridId];
  if (!grid) return doc;
  return touch(doc, { grids: { ...doc.grids, [gridId]: { ...grid, ...patch } } });
};

/** node ids of a node and everything hanging below it */
function subtreeIds(doc: DecisionDoc, rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const edge of doc.edges) {
      if (ids.has(edge.source) && !ids.has(edge.target)) {
        ids.add(edge.target);
        added = true;
      }
    }
  }
  return ids;
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
      openGridId: null,
      theme: 'system',

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
          if (!connection.source || !connection.target || connection.source === connection.target) {
            return state;
          }
          const exists = state.doc.edges.some(
            (e) => e.source === connection.source && e.target === connection.target,
          );
          if (exists) return state;
          // a node has one parent — reconnecting moves the branch
          const edges = state.doc.edges.filter((e) => e.target !== connection.target);
          return {
            doc: touch(state.doc, {
              edges: [
                ...edges,
                { id: id(), source: connection.source, target: connection.target, type: 'thought' },
              ],
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

      deleteNode: (nodeId) =>
        set((state) => {
          // the decision itself stays — deleting it would leave nothing to hang branches on
          if (state.doc.nodes[0]?.id === nodeId) return state;
          const doomed = subtreeIds(state.doc, nodeId);
          const grids = Object.fromEntries(
            Object.entries(state.doc.grids).filter(([, grid]) => !doomed.has(grid.nodeId)),
          );
          const openGridId = state.openGridId && grids[state.openGridId] ? state.openGridId : null;
          return {
            doc: touch(state.doc, {
              nodes: state.doc.nodes.filter((n) => !doomed.has(n.id)),
              edges: state.doc.edges.filter((e) => !doomed.has(e.source) && !doomed.has(e.target)),
              grids,
            }),
            selectedNodeId: state.selectedNodeId && doomed.has(state.selectedNodeId) ? null : state.selectedNodeId,
            openGridId,
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

      openGridForNode: (nodeId) => {
        const existing = get().doc.nodes.find((n) => n.id === nodeId)?.data.gridId;
        if (existing && get().doc.grids[existing]) {
          set({ openGridId: existing, selectedNodeId: nodeId });
          return existing;
        }

        const gridId = id();
        set((state) => {
          const node = state.doc.nodes.find((n) => n.id === nodeId);
          if (!node) return state;
          const branches = childrenOf(state.doc, nodeId);
          const options: GridOption[] =
            branches.length > 0
              ? branches.map((child, index) => ({
                  id: id(),
                  label: child.data.label || `Option ${index + 1}`,
                  nodeId: child.id,
                }))
              : [
                  { id: id(), label: 'Option A' },
                  { id: id(), label: 'Option B' },
                ];

          const grid: Grid = {
            id: gridId,
            nodeId,
            title: 'Compare the options',
            criteria: DEFAULT_CRITERIA.map((label) => ({ id: id(), label, weight: 5 })),
            options,
            cells: {},
            mode: 'weighted',
          };

          return {
            doc: patchNode(touch(state.doc, { grids: { ...state.doc.grids, [gridId]: grid } }), nodeId, {
              gridId,
            }),
            openGridId: gridId,
            selectedNodeId: nodeId,
          };
        });
        return gridId;
      },

      closeGrid: () =>
        set((state) => {
          const grid = state.openGridId ? state.doc.grids[state.openGridId] : undefined;
          if (!grid) return { openGridId: null };
          const { winner, margin, tied, completeness } = scoreGrid(grid);
          // an untouched grid shouldn't stamp a verdict on the node
          const verdict =
            winner && !tied && completeness > 0
              ? { winnerLabel: winner.label, score: winner.total, margin }
              : undefined;
          return { doc: patchNode(state.doc, grid.nodeId, { verdict }), openGridId: null };
        }),

      setGridTitle: (gridId, title) => set((state) => ({ doc: patchGrid(state.doc, gridId, { title }) })),

      setGridMode: (gridId, mode) => set((state) => ({ doc: patchGrid(state.doc, gridId, { mode }) })),

      addCriterion: (gridId, label = '') =>
        set((state) => {
          const grid = state.doc.grids[gridId];
          if (!grid) return state;
          return {
            doc: patchGrid(state.doc, gridId, {
              criteria: [...grid.criteria, { id: id(), label, weight: 5 }],
            }),
          };
        }),

      updateCriterion: (gridId, criterionId, patch) =>
        set((state) => {
          const grid = state.doc.grids[gridId];
          if (!grid) return state;
          return {
            doc: patchGrid(state.doc, gridId, {
              criteria: grid.criteria.map((criterion) =>
                criterion.id === criterionId
                  ? {
                      ...criterion,
                      ...patch,
                      weight:
                        patch.weight === undefined
                          ? criterion.weight
                          : Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(patch.weight))),
                    }
                  : criterion,
              ),
            }),
          };
        }),

      removeCriterion: (gridId, criterionId) =>
        set((state) => {
          const grid = state.doc.grids[gridId];
          if (!grid) return state;
          const cells = Object.fromEntries(
            Object.entries(grid.cells).filter(([key]) => !key.endsWith(`:${criterionId}`)),
          );
          return {
            doc: patchGrid(state.doc, gridId, {
              criteria: grid.criteria.filter((c) => c.id !== criterionId),
              cells,
            }),
          };
        }),

      addOption: (gridId, label = '') =>
        set((state) => {
          const grid = state.doc.grids[gridId];
          if (!grid) return state;
          return { doc: patchGrid(state.doc, gridId, { options: [...grid.options, { id: id(), label }] }) };
        }),

      updateOption: (gridId, optionId, patch) =>
        set((state) => {
          const grid = state.doc.grids[gridId];
          if (!grid) return state;
          return {
            doc: patchGrid(state.doc, gridId, {
              options: grid.options.map((option) =>
                option.id === optionId ? { ...option, ...patch } : option,
              ),
            }),
          };
        }),

      removeOption: (gridId, optionId) =>
        set((state) => {
          const grid = state.doc.grids[gridId];
          if (!grid) return state;
          const cells = Object.fromEntries(
            Object.entries(grid.cells).filter(([key]) => !key.startsWith(`${optionId}:`)),
          );
          return {
            doc: patchGrid(state.doc, gridId, {
              options: grid.options.filter((o) => o.id !== optionId),
              cells,
            }),
          };
        }),

      setCell: (gridId, optionId, criterionId, patch) =>
        set((state) => {
          const grid = state.doc.grids[gridId];
          if (!grid) return state;
          const key = cellKey(optionId, criterionId);
          const current = grid.cells[key] ?? { score: 0, note: '' };
          return {
            doc: patchGrid(state.doc, gridId, {
              cells: { ...grid.cells, [key]: { ...current, ...patch } },
            }),
          };
        }),

      promoteOptions: (gridId) => {
        let created = 0;
        set((state) => {
          const grid = state.doc.grids[gridId];
          if (!grid) return state;
          const parent = state.doc.nodes.find((n) => n.id === grid.nodeId);
          if (!parent) return state;

          const nodes = [...state.doc.nodes];
          const edges = [...state.doc.edges];
          const options = grid.options.map((option) => {
            const alreadyLinked = option.nodeId && nodes.some((n) => n.id === option.nodeId);
            if (alreadyLinked || !option.label.trim()) return option;

            const childId = id();
            const siblings = nodes.filter((n) => edges.some((e) => e.source === parent.id && e.target === n.id));
            nodes.push({
              id: childId,
              type: 'thought',
              position: childPosition(parent, siblings),
              data: { label: option.label, kind: kindForChild(parent.data.kind), note: '' },
            });
            edges.push({ id: id(), source: parent.id, target: childId, type: 'thought' });
            created += 1;
            return { ...option, nodeId: childId };
          });

          return {
            doc: touch(state.doc, {
              nodes,
              edges,
              grids: { ...state.doc.grids, [gridId]: { ...grid, options } },
            }),
          };
        });
        return created;
      },

      newDoc: () => set({ doc: createDoc(), selectedNodeId: null, openGridId: null }),

      loadDoc: (doc) => set({ doc, selectedNodeId: null, openGridId: null }),
    }),
    {
      name: STORAGE_KEY,
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
