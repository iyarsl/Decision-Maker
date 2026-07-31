# Decision Maker

A canvas for thinking a hard choice through, not a calculator that decides for you.

Two linked surfaces:

- **Decision canvas** — drag out a tree of branches and sub-outcomes. Every intersection holds your own
  written reasoning. A branch you have not written into renders faint and dashed; writing it clears the
  fog. The header meter shows how much of the tree you have actually thought about.
- **Pros and cons grid** — open it from any node to weigh that node's branches against the things that
  matter to you. It reports the standing, which criterion is deciding it, and the smallest weight change
  that would flip the result. Options can be sent back to the canvas as branches.

Everything stays in your browser. Autosave to `localStorage`, plus export/import of a `.decision.json`
file so a decision is portable.

Write in any language: every field carrying your words takes its direction from what you type, so Hebrew
reads right to left beside an English branch. The interface stays in English.

New here? The app opens a walkthrough on a first visit — **Guide** in the header brings it back.
[GUIDE.md](GUIDE.md) is the longer written version.

## Run it

```bash
npm install
npm run dev        # http://localhost:5183
```

Requires Node 18+. Vite is pinned to 6.x for Node 18 — Vite 7 needs Node 20.19+.

## Checks

```bash
npm run typecheck
npm test           # Playwright end-to-end
npm run screens    # design review captures into .screens/
```

Playwright needs Chromium's system libraries once:

```bash
sudo npx playwright install-deps chromium
```

## Keys

| Key | What it does |
|---|---|
| Click a card | Opens the thought panel for that branch |
| `Ctrl`/`Cmd` + `Enter` | Adds a branch from the selected node |
| `Delete` | Removes the selected branch and everything under it |
| `Esc` | Closes the grid, then the panel |
| Shift-drag | Selects several nodes |
| Double-click empty canvas | Drops a loose branch |

## Layout

```
src/
  store/     doc state (zustand + persist), scoring, file import/export
  canvas/    React Flow canvas, thought nodes, edges, child placement
  panel/     the writing surface for a single branch
  grid/      weighted comparison sheet
  chrome/    header, clarity meter, file actions
  styles/    design tokens and base styles
```

Scoring: `total(option) = Σ score × weight`, scores run −3…+3, weights 1…10. In **Even** mode every
criterion weighs the same.
