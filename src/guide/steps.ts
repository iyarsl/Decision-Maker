/**
 * The walkthrough. Each step points at a real control and, where it can, watches
 * for the user actually doing the thing — the guide follows the work, not a timer.
 */

export type Place = 'right' | 'left' | 'top' | 'bottom' | 'center';

/** primitives only — the tour re-reads these on every store change */
export interface GuideSnapshot {
  hasQuestion: boolean;
  nodeCount: number;
  writtenCount: number;
  hasSelection: boolean;
  weighOpen: boolean;
  compareOpen: boolean;
  ledgerItems: number;
}

export interface GuideStep {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  /** css selector for the control this step is about */
  anchor?: string;
  place?: Place;
  /** shown instead of the body when the anchor isn't on screen */
  missing?: string;
  /** true once the user has done the thing */
  done?: (snap: GuideSnapshot) => boolean;
  /** 'auto' moves on by itself; 'manual' waits for Next so typing isn't interrupted */
  advance?: 'auto' | 'manual';
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    eyebrow: 'A quick pass',
    title: 'Map it, write it, weigh it',
    body: 'A short pass through a real decision — yours. Nothing here is a demo, and everything you type along the way is kept.',
    place: 'center',
  },
  {
    id: 'question',
    eyebrow: 'Step 1',
    title: 'Name the decision',
    body: 'Type the question the way you would say it out loud. The root card follows along.',
    anchor: '[data-guide="question"]',
    place: 'bottom',
    done: (s) => s.hasQuestion,
    advance: 'manual',
  },
  {
    id: 'select',
    eyebrow: 'Step 2',
    title: 'Open a card',
    body: 'Click the card to open its panel. Drag it to move it, drag the canvas to pan, scroll to zoom.',
    anchor: '[data-guide="root-card"]',
    place: 'right',
    missing: 'Click any card on the canvas.',
    done: (s) => s.hasSelection,
    advance: 'auto',
  },
  {
    id: 'write',
    eyebrow: 'Step 3',
    title: 'Write your thinking',
    body: 'This is the part that matters. What happens if you go this way, what worries you, what would have to be true. The card turns solid the moment there is text, and the Clarity meter counts what is left.',
    anchor: '[data-guide="note"]',
    place: 'left',
    missing: 'Click a card to open its panel.',
    done: (s) => s.writtenCount > 0,
    advance: 'manual',
  },
  {
    id: 'branch',
    eyebrow: 'Step 4',
    title: 'Branch out',
    body: 'One branch for each way this could go — three, five, as many as the decision really has. Branch again off a branch for what follows from it. Delete removes the selected card and everything under it.',
    anchor: '[data-guide="branch"]',
    place: 'left',
    missing: 'Click a card, then use + Branch from here.',
    done: (s) => s.nodeCount > 1,
    advance: 'manual',
  },
  {
    id: 'weigh',
    eyebrow: 'Step 5',
    title: 'Weigh the branch on its own',
    body: 'Every branch has its own page for what is for it and what is against it. Nothing there has to apply to the other branches — it is this one, on its own terms.',
    anchor: '[data-guide="weigh"]',
    place: 'left',
    missing: 'Click a card to open its panel.',
    done: (s) => s.weighOpen,
    advance: 'auto',
  },
  {
    id: 'ledger',
    eyebrow: 'Step 5',
    title: "List what's for it, and what's against",
    body: 'One line per thing, in your words. No criteria to invent, nothing to score against a list you had to write first.',
    anchor: '[data-guide="pro"]',
    place: 'right',
    missing: 'Open a branch, then Weigh this branch.',
    done: (s) => s.ledgerItems > 0,
    advance: 'manual',
  },
  {
    id: 'weights',
    eyebrow: 'Step 5',
    title: 'Say how much each one counts',
    body: 'Five steps, from barely counts to decisive on its own. A line at 5 outweighs a line at 1 five times over, and the net at the bottom is what is left when both sides are in.',
    anchor: '[data-guide="weight"]',
    place: 'bottom',
    missing: 'Add a pro or a con first — the weight sits beside it.',
  },
  {
    id: 'compare',
    eyebrow: 'Step 6',
    title: 'Hold the branches up together',
    body: 'Puts every branch from this card side by side, each with its own case. Nothing is typed twice — it reads what you already wrote on each one.',
    anchor: '[data-guide="compare"]',
    place: 'left',
    missing: 'Click a card with two or more branches, then Compare branches.',
    done: (s) => s.compareOpen,
    advance: 'auto',
  },
  {
    id: 'verdict',
    eyebrow: 'Step 6',
    title: 'Read it, do not obey it',
    body: 'The line here says which branch is ahead, by how much, and which single thing is carrying it. A lead of 1 is noise. If what is carrying the lead is not something you actually care about, the weights are wrong. Done stamps the result back on the card.',
    anchor: '[data-guide="verdict"]',
    place: 'top',
    missing: 'Open a comparison from a card with Compare branches.',
  },
  {
    id: 'keep',
    eyebrow: 'Last thing',
    title: 'It saves itself',
    body: 'Everything stays in this browser as you type. Export writes a .decision.json you can back up, move, or reopen later. Restart this walkthrough any time from Guide.',
    anchor: '[data-guide="save"]',
    place: 'bottom',
  },
];
