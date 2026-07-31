# Decision Maker

A canvas for thinking a hard choice through, not a calculator that decides for you.

Three linked surfaces:

- **Decision canvas** — drag out a tree of branches and sub-outcomes. Every intersection holds your own
  written reasoning. A branch you have not written into renders faint and dashed; writing it clears the
  fog. The header meter shows how much of the tree you have actually thought about.
- **Branch page** — every branch has its own page of what is for it and what is against it, one line per
  thing, in your words. Rating a line is optional: five steps from *barely counts* to *decisive*, and an
  unrated line still counts, as one. Any line can be answered — the con that comes straight back at a pro
  sits under it and takes weight off it, rather than becoming a con of its own. The running net rides back
  onto the card.
- **Compare** — hold a card's branches up side by side. It is a reading of the pages you already wrote,
  never a second place to type, and it says which branch leads, by how much, and what is carrying it.

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
| `Delete` / `Backspace` | Removes the selected branch and everything under it |
| `Esc` | Steps back out: the branch page, then Compare, then the panel |
| `Ctrl`/`Cmd`-click | Holds several branches; drag one and they all move |
| `Ctrl`/`Cmd`-drag on empty canvas | Boxes a selection |
| Double-click empty canvas | Drops a loose branch |

## Layout

```
src/
  store/     doc state (zustand + persist), scoring, file import/export
  canvas/    React Flow canvas, thought nodes, edges, child placement
  panel/     the writing surface for a single branch
  branch/    the branch's own pros and cons, full screen
  compare/   those branches side by side
  chrome/    header, clarity meter, file actions
  styles/    design tokens and base styles
```

Scoring: a line counts `max(0, its weight − the weights answering it)`, weights 1…5 with unrated counting
as one; `net(branch) = Σ pros − Σ cons`. A comparison ranks a card's branches by net, and the margin is the
leader's lead over the runner-up.
