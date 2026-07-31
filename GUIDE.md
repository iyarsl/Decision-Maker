# How to use Decision Maker

A short walkthrough for a first decision. Nothing here needs an account, and nothing leaves your browser.

Run it with `npm run dev`, then open http://localhost:5183.

There is a walkthrough inside the app too: it starts by itself on a first visit, and **Guide** in the header brings it back any time. It points at each control and waits while you do the thing on your own decision. This page is the longer version.

---

## The idea in one paragraph

Most decision tools ask you to score things. This one asks you to *write*. A branch you haven't written your reasoning into stays faded and dashed — visibly unfinished. Writing into it makes it solid. The **Clarity** meter in the header counts written branches against total branches, so an unexamined path is obvious at a glance. The scoring grid is the second half: it takes the options you mapped and tells you not just which one wins, but *what* made it win and how easily that could flip.

Two surfaces, linked:

- **The canvas** — map the decision into branches and sub-outcomes, one written thought per branch.
- **The grid** — open it from any branch to weigh that branch's options against what matters to you.

---

## 1. Name the decision

Type into the big field at the top: *"Should I leave the job?"*, *"Which apartment?"*, *"Do we hire now or wait?"*

The root card on the canvas is your decision. Everything else hangs off it.

## 2. Map the branches

Click a card to select it. A small toolbar appears above it:

| Button | What it does |
| --- | --- |
| **+ Branch** | Adds a child branch below and to the right |
| **Compare** | Opens the scoring grid for that card's options |
| **Lean here** | Marks the path you're leaning toward, in amber |
| **Delete** | Removes the branch and everything under it |

Deleting leaves an **Undo** on offer for a few seconds, so a wrong Delete costs nothing. A branch fed by another card as well as this one stays put — it was never only this one's.

The panel has the same thing as **Delete branch**, and the `Delete` or `Backspace` key removes the card you are looking at — panel open or not, as long as the caret isn't in a text field. The key also removes whatever is selected on the canvas — including a connector, if you click one first. Shift+click to select several and delete them together. Deleting a branch takes its sub-branches and any grid it owned with it. The decision card itself cannot be deleted; **New** clears the board instead.

There is **no limit of two branches**. Add as many as the decision actually has — five options, three outcomes under one of them, whatever the shape is. New siblings stack and re-centre under their parent automatically.

Other ways to add:

- **Double-click empty canvas** — drops a loose card wherever you clicked.
- **Ctrl/Cmd + Enter** — adds a branch from the selected card.
- **Drag from a card's side handle to another card** — connects them by hand. A card can feed as many others as you like, and can be fed by several: two options often lead to the same outcome. Drop anywhere near the target's handle and it snaps.

Every card is a **type**, set in the panel:

- **Decision** — a fork you control.
- **Option** — one of the things you could do.
- **Outcome** — something that could happen as a result. Outcome cards get a *likelihood* slider.

## 3. Write at every intersection — the important part

Click a card, or double-click it, and the panel opens on the right.

The big field is **"Your thinking here."** This is the point of the app. Write what happens if you go this way, what worries you, what would have to be true for it to work. One honest paragraph beats a rating.

The moment there's text in it, the card resolves: solid border, full contrast, filled dot. Its edge to the parent stops being dashed. The Clarity meter ticks up.

Also in the panel:

- **Gut read** — a quick emotional register, kept deliberately separate from the analysis. It's for what the scoring misses.
- **How likely does this feel** — on outcome cards only.
- **Lean this way** — the amber path. Amber is used for nothing else in the app, so where you're leaning is never ambiguous.

Press **Esc** or **Close** to dismiss the panel.

## 4. Weigh the options

Select the card whose options you want to compare — usually the root — and hit **Compare**. The grid opens, seeded with that card's branches as columns. If the card has no branches yet, you get two blank ones.

**Rows are what matters to you.** Three are there to start (*What it costs me*, *What it gives me*, *How it feels in a year*) — rename them, delete them, add your own with **+ What matters**. Each row has a weight slider, 1–10. A criterion at ×9 counts three times as hard as one at ×3.

**Cells are how each option scores on that row.** Seven steps, from **Strong con** to **Strong pro**, with a notch in the middle that never reads as filled — a cell you haven't touched looks untouched. Cons run red, pros run green.

Hover a cell and a **why** link appears: a place to write the one line explaining that score. Notes stick around and the link stays visible once written.

**Weighted vs Even** (top right) switches between counting weights and treating every row the same. Weighted is the honest default; Even is a useful sanity check — if the winner changes when weights come off, the weights are doing the deciding.

### Reading the result

The bar under each column is its total: `Σ score × weight`. The line in the footer says it in words:

> **Take it** leads by 20 — mostly on *What it gives me*. Move *What it costs me* from ×4 to ×7 and it flips. 58% of the cells are filled.

Four things to notice there:

1. **The margin.** A lead of 2 is noise. A lead of 20 is a decision.
2. **The deciding criterion.** If the thing carrying the win isn't something you actually care about, your weights are wrong.
3. **The swing hint.** The smallest single weight change that flips the leader. If a one-notch nudge flips it, the grid isn't telling you much — the options are genuinely close.
4. **Completeness.** A verdict off 40% of the cells is a guess.

If it comes out level, the footer says so. Usually that means something that matters is missing from the rows.

### Back to the canvas

- **Send options to the canvas** — gives every grid option its own branch, for options you typed in the grid rather than mapping first.
- **Done** (or **Esc**) — closes the grid and stamps the verdict onto the card you opened it from: *"Grid says Take it, ahead by 20."* Reopening **Compare** on that card brings the same grid back, scores intact.

Any card can own its own grid. Compare high-level options at the root, then open a separate grid further down for a sub-choice.

## 5. Moving around

The canvas is fully live:

- **Drag a card** to move it. **Drag empty space** to pan. **Scroll** to pan; **pinch or Ctrl+scroll** to zoom.
- **Bottom-right controls** — zoom in/out, fit the whole tree on screen.
- **Bottom-left minimap** — drag it to jump. Cards are colour-coded: amber = leaning, light = written, dark = still unwritten.
- **Ctrl+click** (Cmd on a Mac) adds cards to a selection — drag any one of them and the whole group travels, keeping its shape. **Ctrl+drag across empty canvas** boxes a selection instead of panning. **Delete** removes everything held.
- **Align branches**, top right, puts the whole map back on one grid: a column per depth, siblings a row apart, every card centred under what it came from. Nothing is lost — anything you dragged out on purpose can be dragged back, and **Undo** sits at the bottom of the screen for a few seconds after.
- Moving a card never opens its panel. The panel is for a click that stayed still; if the card you open sits under the drawer, the view slides just far enough to keep it in sight.
- A selection of two or more closes the panel and hides the card toolbar: those actions speak for one card at a time.
- A card dropped on empty canvas floats free until you drag a connector into it — and can be deleted like any other.

## 6. Saving, sharing, starting over

- **Autosave.** Everything writes to your browser's local storage as you type. Close the tab and come back — it's there.
- **Export** downloads the whole decision as a `.decision.json` file. That's your backup and your way to move it to another machine or send it to someone.
- **Open** loads a `.decision.json` back in. It asks before replacing what's on screen.
- **New** clears everything and starts fresh. Export first if you want to keep the old one.

Local storage is per-browser and per-device. Nothing syncs. If it matters, export it.

**Auto / Dark / Light** cycles the theme; Auto follows your OS.

## Writing in Hebrew

Write in whatever language you think in. Every field that holds your words — the question, branch names, your thinking, criteria, option names, cell notes — sets its own direction from what you type, so Hebrew reads right-to-left and an English branch beside it still reads left-to-right. Mixed sentences keep their parts in the right order. The interface itself stays in English.

---

## Keyboard

| Key | Does |
| --- | --- |
| `Ctrl/Cmd + Enter` | Branch from the selected card |
| `Delete` / `Backspace` | Delete the selected card and its subtree, or the selected connector |
| `Esc` | Close the panel or the grid |
| `Tab` / `Shift+Tab` | Move between cards and controls |
| Double-click card | Open its panel |
| Double-click canvas | New loose card there |

---

## A worked example

**"Should I leave the job?"**

1. Type the question. Select the root, **+ Branch** three times: *Take the offer*, *Stay and renegotiate*, *Leave with nothing lined up*.
2. Write into each one. Not a summary — the actual worry. *"Better pay, team ships weekly. But I'd be starting over on trust, and I'd miss the people here."* Clarity goes to 4/4.
3. Branch off *Take the offer* with two outcome cards: *It's the team they described* (likelihood 60%) and *It's the same job with a new logo* (40%). Write both.
4. Select the root, **Compare**. Rename the rows to what actually matters: *Money*, *Whether I'd learn anything*, *How far it is from home*. Weight them 4 / 9 / 7.
5. Score each option, leaving a `why` on the ones that surprise you.
6. Read the footer. *Take the offer leads by 20 — mostly on Whether I'd learn anything.* That's the real reason. If seeing it in writing makes you flinch, that's information too.
7. **Done**, then **Lean here** on the branch you're going with. Export the file — in six months, it'll tell you what you actually knew at the time.

---

## When it isn't helping

- **Everything scores the same.** Your rows are too abstract. *"Quality of life"* doesn't discriminate; *"How far it is from home"* does.
- **The winner feels wrong.** Trust the flinch — it usually means a criterion is missing, or a weight is set to what you think you should care about rather than what you do. Fix the grid, don't override it.
- **You can't write the note.** That's the finding, not a blocker. A branch you can't explain isn't one you've thought about yet.
