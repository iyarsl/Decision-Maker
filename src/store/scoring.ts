import type { Counter, LedgerItem, TreeNode, TreeNodeData } from '../types';

export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 5;

/**
 * Rating a line is optional. An unrated line is still on the board and still counts —
 * it just counts as one, which makes an unrated list behave like a plain tally of pros
 * against cons. Saying more than that is what the five steps are for.
 */
export const UNRATED_WEIGHT = MIN_WEIGHT;

/** what a line was rated at, before anything came back at it */
export const statedWeight = (item: LedgerItem | Counter) => item.weight ?? UNRATED_WEIGHT;

const counterWeight = (item: LedgerItem) =>
  (item.counters ?? [])
    .filter((counter) => counter.text.trim().length > 0)
    .reduce((sum, counter) => sum + statedWeight(counter), 0);

/**
 * What a line actually counts for. A counter is the answer that comes straight back at it,
 * and it takes weight off the line it answers rather than piling onto the other column —
 * a pro you have an answer to is a smaller pro, not a new con.
 */
export const weightOf = (item: LedgerItem) => Math.max(0, statedWeight(item) - counterWeight(item));

export const WEIGHT_LABEL: Record<number, string> = {
  1: 'Barely counts',
  2: 'Counts a little',
  3: 'Counts fairly',
  4: 'Counts a lot',
  5: 'Decisive on its own',
};

export interface Balance {
  pros: LedgerItem[];
  cons: LedgerItem[];
  /** Σ of the pro weights */
  forTotal: number;
  /** Σ of the con weights */
  againstTotal: number;
  net: number;
  /** the single item carrying the most, whichever side it is on */
  heaviest?: LedgerItem;
  count: number;
}

const named = (item: LedgerItem) => item.text.trim().length > 0;
const heaviestOf = (items: LedgerItem[]) =>
  items.reduce<LedgerItem | undefined>(
    (best, item) => (best === undefined || weightOf(item) > weightOf(best) ? item : best),
    undefined,
  );

/** What a branch weighs on its own — nothing here looks at its siblings. */
export function balanceOf(data: TreeNodeData): Balance {
  // an unnamed row is a row the user started and hasn't said anything in yet
  const items = (data.ledger ?? []).filter(named);
  const pros = items.filter((item) => item.side === 'pro');
  const cons = items.filter((item) => item.side === 'con');
  const forTotal = pros.reduce((sum, item) => sum + weightOf(item), 0);
  const againstTotal = cons.reduce((sum, item) => sum + weightOf(item), 0);

  return {
    pros,
    cons,
    forTotal,
    againstTotal,
    net: forTotal - againstTotal,
    heaviest: heaviestOf(items),
    count: items.length,
  };
}

export interface Standing {
  nodeId: string;
  label: string;
  balance: Balance;
}

export interface Comparison {
  /** highest net first */
  ranked: Standing[];
  leader?: Standing;
  runnerUp?: Standing;
  /** leader's net minus the runner-up's; 0 when level */
  margin: number;
  tied: boolean;
  /** the leader's heaviest pro — what is actually carrying the lead */
  carriedBy?: LedgerItem;
  /** branches with nothing listed either way */
  unweighed: number;
  /** branches that have something listed */
  weighed: number;
}

/** Puts the branches of one intersection side by side, off what each already holds. */
export function compareBranches(branches: TreeNode[]): Comparison {
  const standings: Standing[] = branches.map((branch) => ({
    nodeId: branch.id,
    label: branch.data.label,
    balance: balanceOf(branch.data),
  }));

  const ranked = [...standings].sort((a, b) => b.balance.net - a.balance.net);
  const [leader, runnerUp] = ranked;
  const margin = leader && runnerUp ? leader.balance.net - runnerUp.balance.net : 0;
  const unweighed = standings.filter((standing) => standing.balance.count === 0).length;

  return {
    ranked,
    leader,
    runnerUp,
    margin,
    tied: Boolean(leader && runnerUp && margin === 0),
    carriedBy: leader ? heaviestOf(leader.balance.pros) : undefined,
    unweighed,
    weighed: standings.length - unweighed,
  };
}
