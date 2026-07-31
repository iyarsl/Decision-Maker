import { nanoid } from 'nanoid';
import { DOC_VERSION, type DecisionDoc, type LedgerItem, type TreeNode } from '../types';

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'decision';

export function exportDoc(doc: DecisionDoc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug(doc.question)}.decision.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export class ImportError extends Error {}

/* ---------------------------------------------------------------------------
   v1 → v2: the criteria grid becomes each branch's own ledger.

   v1 held one grid per intersection: criteria down the side (weighted 1-10),
   the intersection's branches across the top, cells scored -3…+3. v2 gives every
   branch its own list of what's for and against it. A scored cell already says
   exactly that about one branch, so it carries over: the criterion's label
   becomes the line, the sign picks the side, and the strength becomes the weight.
   Grid options that were never sent to the canvas have no branch to land on and
   are dropped with the grid.
   --------------------------------------------------------------------------- */

interface V1Cell {
  score?: number;
  note?: string;
}

interface V1Grid {
  nodeId?: string;
  criteria?: { id?: string; label?: string }[];
  options?: { id?: string; nodeId?: string }[];
  cells?: Record<string, V1Cell>;
}

/** three steps of score onto five of weight */
const WEIGHT_FROM_SCORE: Record<number, number> = { 1: 2, 2: 3, 3: 5 };

function ledgersFromGrids(grids: Record<string, V1Grid>): Map<string, LedgerItem[]> {
  const byNode = new Map<string, LedgerItem[]>();

  for (const grid of Object.values(grids)) {
    for (const option of grid.options ?? []) {
      if (!option?.nodeId || !option.id) continue;
      const items = byNode.get(option.nodeId) ?? [];

      for (const criterion of grid.criteria ?? []) {
        if (!criterion?.id) continue;
        const cell = grid.cells?.[`${option.id}:${criterion.id}`];
        const score = cell?.score ?? 0;
        if (!score) continue;
        const note = cell?.note?.trim();
        items.push({
          id: nanoid(8),
          side: score > 0 ? 'pro' : 'con',
          text: [criterion.label?.trim(), note].filter(Boolean).join(' — ') || 'Unnamed',
          weight: WEIGHT_FROM_SCORE[Math.min(3, Math.abs(score))] ?? 3,
        });
      }

      byNode.set(option.nodeId, items);
    }
  }

  return byNode;
}

/** Normalises any accepted version into a current doc. Shared by import and autosave. */
export function migrateDoc(value: unknown): DecisionDoc {
  const doc = value as
    | (Omit<Partial<DecisionDoc>, 'version'> & { version?: number; grids?: Record<string, V1Grid> })
    | null;
  if (!doc || typeof doc !== 'object') throw new ImportError("That file isn't a decision.");
  if (doc.version !== 1 && doc.version !== DOC_VERSION) {
    throw new ImportError(`This file was saved by a different version (${String(doc.version)}).`);
  }
  if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
    throw new ImportError('This decision file is missing its tree.');
  }

  const ledgers = doc.version === 1 ? ledgersFromGrids(doc.grids ?? {}) : new Map<string, LedgerItem[]>();

  return {
    id: doc.id ?? nanoid(8),
    version: DOC_VERSION,
    question: doc.question ?? '',
    createdAt: doc.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: doc.nodes.map((node): TreeNode => {
      const carried = ledgers.get(node.id);
      const existing = Array.isArray(node.data?.ledger) ? node.data.ledger : undefined;
      const ledger = carried?.length ? [...(existing ?? []), ...carried] : existing;
      const { gridId: _dropped, ...data } = (node.data ?? {}) as TreeNode['data'] & { gridId?: string };

      return {
        ...node,
        type: 'thought' as const,
        // selection is a view state — a file must never arrive pre-selected
        selected: false,
        dragging: false,
        data: {
          ...data,
          label: data.label ?? '',
          kind: data.kind ?? 'option',
          note: data.note ?? '',
          ...(ledger?.length ? { ledger } : {}),
        },
      };
    }),
    edges: doc.edges.map((edge) => ({ ...edge, type: 'thought' })),
  };
}

export function parseDoc(raw: string): DecisionDoc {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ImportError("That file isn't valid JSON.");
  }
  return migrateDoc(value);
}

export function readDocFile(file: File): Promise<DecisionDoc> {
  return file.text().then(parseDoc);
}
