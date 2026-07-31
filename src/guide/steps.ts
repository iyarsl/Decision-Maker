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
  gridOpen: boolean;
  scoredCells: number;
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
    id: 'compare',
    eyebrow: 'Step 5',
    title: 'Weigh the options',
    body: 'Opens a scoring grid for this card, with its branches already in as columns.',
    anchor: '[data-guide="compare"]',
    place: 'left',
    missing: 'Click a card, then Compare options.',
    done: (s) => s.gridOpen,
    advance: 'auto',
  },
  {
    id: 'weights',
    eyebrow: 'Step 5',
    title: 'Say what matters',
    body: 'Rows are your reasons — rename them to the real ones. The slider is how much each reason counts, 1 to 10. A row at ×9 outweighs a row at ×3 three times over.',
    anchor: '[data-guide="weight"]',
    place: 'right',
    missing: 'Open the grid from a card with Compare options.',
  },
  {
    id: 'score',
    eyebrow: 'Step 5',
    title: 'Score each option',
    body: 'Seven steps from strong con to strong pro. Hover a cell and why appears — one line on the scores that surprised you is worth more than the number.',
    anchor: '[data-guide="cell"]',
    place: 'bottom',
    missing: 'Open the grid from a card with Compare options.',
    done: (s) => s.scoredCells > 0,
    advance: 'manual',
  },
  {
    id: 'verdict',
    eyebrow: 'Step 6',
    title: 'Read it, do not obey it',
    body: 'The line here says who leads, by how much, which row decided it, and the smallest weight change that would flip it. A lead of 2 is noise. If the row carrying the win is not one you care about, your weights are wrong. Done stamps the result back on the card.',
    anchor: '[data-guide="verdict"]',
    place: 'top',
    missing: 'Open the grid from a card with Compare options.',
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
