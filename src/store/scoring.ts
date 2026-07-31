import { cellKey, type Grid } from '../types';

export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 10;
export const MIN_SCORE = -3;
export const MAX_SCORE = 3;

export interface OptionResult {
  optionId: string;
  label: string;
  total: number;
  /** per-criterion contribution, keyed by criterion id */
  contributions: Record<string, number>;
  /** how many cells the user has actually filled in */
  filled: number;
}

export interface Swing {
  criterionId: string;
  criterionLabel: string;
  from: number;
  to: number;
}

export interface GridResult {
  results: OptionResult[];
  /** results sorted high to low */
  ranked: OptionResult[];
  winner?: OptionResult;
  runnerUp?: OptionResult;
  /** winner total minus runner-up total; 0 when tied */
  margin: number;
  tied: boolean;
  /** criterion that separates winner from runner-up the most */
  decidingCriterionId?: string;
  /** smallest single weight change that would flip the winner, if any */
  swing?: Swing;
  /** filled cells / possible cells, 0-1 */
  completeness: number;
}

const weightOf = (grid: Grid, criterionId: string) => {
  if (grid.mode === 'simple') return 1;
  return grid.criteria.find((c) => c.id === criterionId)?.weight ?? 1;
};

export function scoreGrid(grid: Grid): GridResult {
  const results: OptionResult[] = grid.options.map((option) => {
    const contributions: Record<string, number> = {};
    let total = 0;
    let filled = 0;

    for (const criterion of grid.criteria) {
      const cell = grid.cells[cellKey(option.id, criterion.id)];
      const score = cell?.score ?? 0;
      if (cell && (cell.score !== 0 || cell.note.trim().length > 0)) filled += 1;
      const contribution = score * weightOf(grid, criterion.id);
      contributions[criterion.id] = contribution;
      total += contribution;
    }

    return { optionId: option.id, label: option.label, total, contributions, filled };
  });

  const ranked = [...results].sort((a, b) => b.total - a.total);
  const [winner, runnerUp] = ranked;
  const margin = winner && runnerUp ? winner.total - runnerUp.total : 0;

  let decidingCriterionId: string | undefined;
  if (winner && runnerUp) {
    let best = -Infinity;
    for (const criterion of grid.criteria) {
      const gap = (winner.contributions[criterion.id] ?? 0) - (runnerUp.contributions[criterion.id] ?? 0);
      if (gap > best) {
        best = gap;
        decidingCriterionId = criterion.id;
      }
    }
    if (best <= 0) decidingCriterionId = undefined;
  }

  const possible = grid.options.length * grid.criteria.length;
  const completeness = possible === 0 ? 0 : results.reduce((sum, r) => sum + r.filled, 0) / possible;

  return {
    results,
    ranked,
    winner,
    runnerUp,
    margin,
    tied: Boolean(winner && runnerUp && margin === 0),
    decidingCriterionId,
    swing: findSwing(grid, winner, runnerUp),
    completeness,
  };
}

/**
 * Smallest single-criterion weight change that would put the runner-up ahead.
 * Only meaningful in weighted mode — in simple mode every criterion counts the same.
 */
function findSwing(grid: Grid, winner?: OptionResult, runnerUp?: OptionResult): Swing | undefined {
  if (grid.mode !== 'weighted' || !winner || !runnerUp) return undefined;

  const lead = winner.total - runnerUp.total;
  if (lead <= 0) return undefined;

  let best: Swing | undefined;
  let bestDistance = Infinity;

  for (const criterion of grid.criteria) {
    const winnerScore = grid.cells[cellKey(winner.optionId, criterion.id)]?.score ?? 0;
    const runnerScore = grid.cells[cellKey(runnerUp.optionId, criterion.id)]?.score ?? 0;
    const perUnit = winnerScore - runnerScore;
    if (perUnit === 0) continue;

    // lead + delta * perUnit < 0  →  the runner-up takes the lead
    const rawDelta = -lead / perUnit;
    // nudge past the tie, and land on a whole weight step
    const delta = rawDelta > 0 ? Math.ceil(rawDelta + 0.001) : Math.floor(rawDelta - 0.001);
    const target = criterion.weight + delta;
    if (target < MIN_WEIGHT || target > MAX_WEIGHT) continue;

    const distance = Math.abs(delta);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = {
        criterionId: criterion.id,
        criterionLabel: criterion.label,
        from: criterion.weight,
        to: target,
      };
    }
  }

  return best;
}

export const SCORE_LABEL: Record<number, string> = {
  [-3]: 'Strong con',
  [-2]: 'Con',
  [-1]: 'Slight con',
  0: 'Neutral',
  1: 'Slight pro',
  2: 'Pro',
  3: 'Strong pro',
};
