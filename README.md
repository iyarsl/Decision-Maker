# Decision Maker

A canvas for thinking a hard choice through, not a calculator that decides for you.

Three linked surfaces:

- **Decision canvas** — drag out a tree of branches and sub-outcomes. Every intersection holds your own
  written reasoning. A branch you have not written into renders faint and dashed; writing it clears the
  fog. The header meter shows how much of the tree you have actually thought about.
- **Branch page** — every branch has its own page of what is for it and what is against it, one line per
  thing, in your words. Rating a line is optional: five steps from *barely counts* to *decisive*, and an
  unrated line still counts, as one. Any line can be answered — the con that comes straight back at a pro
  sits under it and takes weight off it, rather than becoming a con of its own. The card on the map shows
  which way the weight sits and how many lines are on each side — the totals stay on the page where the
  lines are there to back them up.
- **Compare** — hold a card's branches up side by side. It is a reading of the pages you already wrote,
  never a second place to type, and it says which branch leads, by how much, and what is carrying it.

**Decide** in the header puts the editing away: the same map with no toolbars, no dragging and nothing
editable, so the finished decision can be read without being nudged. Marking the path you're taking is the
one thing still writable.

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

## Deploying

The build is a static site — no server, no environment, no secrets. `npm run build` writes `dist/`.

**A version is a tag.** Pushing one builds that commit, runs typecheck and the full Playwright suite
against it, and only then publishes to GitHub Pages:

```bash
npm version patch      # or minor / major — writes package.json and tags it
git push --follow-tags
```

`.github/workflows/deploy.yml` does the rest; `.github/workflows/checks.yml` runs the same checks on every
push to `main`, so a tag is rarely where you find out something broke. Landing URL:
`https://<user>.github.io/Decision-Maker/`.

Two one-time repository settings, both of which fail loudly if missed:

1. **Settings → Pages → Source: GitHub Actions** — otherwise `configure-pages` reports
   *Get Pages site failed*. The workflow cannot do this itself: creating the site needs admin rights the
   workflow token does not have.
2. **Settings → Environments → `github-pages` → Deployment branches and tags** — add a **Tag** rule `v*`.
   The environment defaults to the default branch only, so a tag is refused with
   *not allowed to deploy to github-pages due to environment protection rules*.

A project site is served from a subpath, so the deploy passes `BASE_PATH=/<repo>/` to the build
(`vite.config.ts`). Everywhere else — the dev server, a local build — stays at the root. Hosting it at a
domain root instead (Netlify, Cloudflare Pages, Vercel: build `npm run build`, output `dist`) needs no base
at all.

Storage is per-origin: a decision saved on `localhost` is not the one on the deployed site. Export the
`.decision.json` and import it there.

## Keys

| Key | What it does |
|---|---|
| Click a card | Opens the thought panel for that branch |
| `Ctrl`/`Cmd` + `Enter` | Adds a branch from the selected node |
| `Delete` / `Backspace` | Removes the selected branch and everything under it |
| `Esc` | Steps back out: the branch page, then Compare, then the panel |
| `Ctrl`/`Cmd` + `Z` | Takes back the last delete or align |
| `Enter` in a pro or con | Starts the next line; `Shift`+`Enter` breaks this one |
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
