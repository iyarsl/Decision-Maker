import type { Feeling } from '../types';

/** the gut check, kept deliberately separate from the analysis */
export const FEELINGS: { value: Feeling; label: string; glyph: string }[] = [
  { value: -2, label: 'Dreading it', glyph: '▁' },
  { value: -1, label: 'Uneasy', glyph: '▃' },
  { value: 0, label: 'Neutral', glyph: '▄' },
  { value: 1, label: 'Drawn to it', glyph: '▆' },
  { value: 2, label: 'Alive to it', glyph: '█' },
];
