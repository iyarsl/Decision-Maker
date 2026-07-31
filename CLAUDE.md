# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A client-side app for thinking a hard decision through: a React Flow canvas of branches you write your
reasoning into, plus a weighted pros/cons grid that opens from any card and stamps its verdict back onto
it. No backend, no accounts — `localStorage` plus JSON export/import. `GUIDE.md` is the user-facing
walkthrough and is the fastest way to understand intended behaviour.

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
React Flow nodes/edges, grids) plus view state (`selectedNodeId`, `openGridId`, `theme`, `undo`). Every
mutation goes through `touch()` so `updatedAt` cannot drift. React Flow is fully controlled from here.

**Derived, never stored:** a branch is "resolved" when `data.note` has content (`isResolved` in
`src/types.ts`). The clarity meter, node styling and edge fading all read that.

**The root is `doc.nodes[0]`** — not "the node with no parent", because a card dropped on empty canvas also
has no parent. The root cannot be deleted and takes no incoming connections; loose cards can be both.

**The graph is a DAG, not a tree.** A branch may be fed by several parents. `subtreeIds` therefore deletes a
descendant only when *every* parent it has is also being deleted. `tidyTree` and `pathToRoot` take the first
parent and guard against cycles.

**Grids** live in `doc.grids`, keyed by id, owned by a node (`grid.nodeId`, `node.data.gridId`). Cells are
keyed `` `${optionId}:${criterionId}` `` (`cellKey`). All maths is in `src/store/scoring.ts` — totals,
the deciding criterion, and the "swing" (smallest single weight change that flips the leader). Closing a
scored, untied grid writes `verdict` onto the owning node.

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
  grid/      weighted comparison sheet
  guide/     first-run walkthrough (own persisted store, own step list)
  chrome/    header, clarity meter, file actions, undo bar
  styles/    tokens.css (palette, type, spacing) and global.css
```
