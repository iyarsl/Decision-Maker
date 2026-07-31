import type { DecisionDoc } from '../types';

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

export function parseDoc(raw: string): DecisionDoc {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ImportError("That file isn't valid JSON.");
  }

  const doc = value as Partial<DecisionDoc>;
  if (!doc || typeof doc !== 'object') throw new ImportError("That file isn't a decision.");
  if (doc.version !== 1) {
    throw new ImportError(`This file was saved by a different version (${String(doc.version)}).`);
  }
  if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
    throw new ImportError('This decision file is missing its tree.');
  }

  return {
    id: doc.id ?? crypto.randomUUID(),
    version: 1,
    question: doc.question ?? '',
    createdAt: doc.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: doc.nodes.map((node) => ({
      ...node,
      type: 'thought' as const,
      // selection is a view state — a file must never arrive pre-selected
      selected: false,
      dragging: false,
      data: {
        ...node.data,
        label: node.data?.label ?? '',
        kind: node.data?.kind ?? 'option',
        note: node.data?.note ?? '',
      },
    })),
    edges: doc.edges.map((edge) => ({ ...edge, type: 'thought' })),
    grids: doc.grids ?? {},
  };
}

export function readDocFile(file: File): Promise<DecisionDoc> {
  return file.text().then(parseDoc);
}
