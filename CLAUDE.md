# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A client-side app for thinking a hard decision through: a React Flow canvas of branches you write your
reasoning into; a full-screen page per branch holding what is for it and what is against it; and a
comparison that reads those pages and stamps its standing back onto the card the branches hang off. No
backend, no accounts — `localStorage` plus JSON export/import. `GUIDE.md` is the user-facing walkthrough
and is the fastest way to understand intended behaviour.

## Commands

```bash
npm run dev            # http://localhost:5183 (strictPort)
npm run typecheck      # tsc -b --noEmit
npm run build          # tsc -b && vite build
npm test               # Playwright; starts/reuses the dev server itself
npm run screens        # design captures into .screens/ — needs the dev server up
npx playwright test -g "align puts the map"    # one test by title
```

Node here is 18, so **Vite is pinned to 6.x and @playwright/test to 1.54.x** — both newer majors require
Node 20.19+. Do not bump either without bumping Node.

Playwright needs Chromium's system libraries once: `sudo npx playwright install-deps chromium`.

## Architecture

**One store owns the document.** `src/store/useDecisionStore.ts` holds the entire `DecisionDoc` (question,
React Flow nodes/edges) plus view state (`selectedNodeId`, `weighNodeId`, `compareNodeId`, `theme`,
`undo`). Every mutation goes through `touch()` so `updatedAt` cannot drift. React Flow is fully controlled
from here.

**Derived, never stored:** a branch is "resolved" when `data.note` has content — **or when its kind is
`decision`**, which is a fork rather than a claim and so is never in the fog (`isResolved` in
`src/types.ts`). The clarity meter, node styling and edge fading all read that. The walkthrough's
`writtenCount` deliberately does not: it is waiting for the user to type, so it counts notes.

**The root is `doc.nodes[0]`** — not "the node with no parent", because a card dropped on empty canvas also
has no parent. The root cannot be deleted and takes no incoming connections; loose cards can be both.

**The graph is a DAG, not a tree.** A branch may be fed by several parents. `subtreeIds` therefore deletes a
descendant only when *every* parent it has is also being deleted. `tidyTree` and `pathToRoot` take the first
parent and guard against cycles.

**Weighing lives on the node, not beside it.** `data.ledger` is an array of `LedgerItem`
(`side: 'pro' | 'con'`, `text`, optional `weight` 1–5), so a branch carries its own case and deleting the
node takes it. `src/store/scoring.ts` is the only maths: `balanceOf(data)` gives for/against/net, and
`compareBranches(children)` ranks an intersection. **`weight` is optional and an unrated line counts as
one**, and **a line's `counters` come off its own weight** (floored at zero) rather than scoring for the
other side — so `weightOf(item)` is the only correct way to ask what a line counts, and `statedWeight` is
for the rating controls alone. Never read `item.weight` directly. Closing a comparison of
branches that are weighed and untied writes `verdict` onto the node they hang off.

**Two full-screen surfaces, one at a time.** `weighNodeId` opens `src/branch/BranchPage.tsx` (the only
place a ledger is edited) and `compareNodeId` opens `src/compare/CompareView.tsx` (strictly read-only —
one authoring surface is the point of the design). Escape steps back out in that order, and the
Delete-key handler in `App.tsx` stands down while either is open.

**Doc version 2.** `migrateDoc` in `src/store/io.ts` turns a v1 criteria grid into per-branch ledgers and
is wired into both `persist.migrate` and `parseDoc`, so autosave and import take the same path. Bumping
the shape means bumping `DOC_VERSION` and extending that one function.

**Undo is one step, briefly.** Any action that pushes `undo` stores a whole-document snapshot with a
timestamp; `src/chrome/UndoBar.tsx` shows it and calls `dismissUndo` after 8s. It is never persisted.

## Rules that are easy to break

- **Selectors must return primitives or memoized values.** An object-returning zustand selector re-renders
  forever. `selectClarity(nodes)` is a plain function used with `useMemo`; `ThoughtEdge` takes two separate
  primitive selectors rather than one object.
- **Never persist `selected` / `dragging`.** `partialize` strips them; restoring them puts React Flow's idea
  of the selection at odds with the store's and the app locks up with "Maximum update depth exceeded".
- **React Flow owns the selection flags.** `focusNode(id)` only sets which card the panel speaks for — use it
  from canvas events, or a Ctrl-click that adds to a selection gets thrown away. `selectNode(id)` forces a
  single selection and is for programmatic paths (`addChild`, closing the panel).
- **The panel opens on a click that did not become a drag** — `onNodeClick` plus a ref set in
  `onNodeDragStart`. Do not go back to opening it from `onSelectionChange`.
- **Handle CSS in `canvas/canvas.css`:** never set `transform` on `.react-flow__handle` (React Flow
  positions it with one) and never put the hit area in an `::after` overlay (it steals the handle's own hit
  test and connections silently stop working). The handle is a 20px target with the dot drawn by `::before`.
- **Amber `--signal` is reserved for the path the user is leaning toward.** Nothing else may use it.
- **User text sets its own direction:** every field holding the user's words carries `dir="auto"`, and their
  labels inside English sentences are wrapped in `<bdi>`. The interface itself stays English and LTR.

## Tests

`tests/e2e.spec.ts` drives the real UI, single worker, no parallelism. `fresh(page)` clears storage *and*
seeds `decision-maker:guide:v1` with `seen: true` — without that the first-run walkthrough covers the app
and everything times out. `tests/screenshot.ts` is a design-review tool, not a test.

Selecting a card can animate the viewport (a card under the panel slides into the open), so wait for the
view to settle before measuring node or handle positions, or coordinates will be stale and clicks will land
on the pane.

## Layout

```
src/
  store/     document state, scoring, JSON import/export
  canvas/    React Flow canvas, node/edge components, placement maths (layout.ts)
  panel/     the writing surface for a single branch
  branch/    that branch's pros and cons, full screen — the only place they are edited
  compare/   an intersection's branches side by side, read-only
  guide/     first-run walkthrough (own persisted store, own step list)
  chrome/    header, clarity meter, file actions, undo bar
  styles/    tokens.css (palette, type, spacing) and global.css
```
