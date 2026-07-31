# How to use Decision Maker

A short walkthrough for a first decision. Nothing here needs an account, and nothing leaves your browser.

Run it with `npm run dev`, then open http://localhost:5183.

There is a walkthrough inside the app too: it starts by itself on a first visit, and **Guide** in the header brings it back any time. It points at each control and waits while you do the thing on your own decision. This page is the longer version.

---

## The idea in one paragraph

Most decision tools ask you to score things. This one asks you to *write*. A branch you haven't written your reasoning into stays faded and dashed — visibly unfinished. Writing into it makes it solid. The **Clarity** meter in the header counts written branches against total branches, so an unexamined path is obvious at a glance. Weighing is the second half: every branch gets its own page of what is for it and what is against it, and comparing branches only ever reads what you wrote on each one.

Three surfaces, linked:

- **The canvas** — map the decision into branches and sub-outcomes, one written thought per branch.
- **The branch page** — what's for this branch, what's against it, and how much each line counts.
- **Compare** — open it from a card to hold its branches up against each other, side by side.

---

## 1. Name the decision

Type into the big field at the top: *"Should I leave the job?"*, *"Which apartment?"*, *"Do we hire now or wait?"*

The root card on the canvas is your decision. Everything else hangs off it.

## 2. Map the branches

Click a card to select it. A small toolbar appears above it:

| Button | What it does |
| --- | --- |
| **+ Branch** | Adds a child branch below and to the right |
| **Weigh** | Opens this branch's own page of pros and cons |
| **Compare** | Holds this card's branches up side by side — needs at least two |
| **Lean here** | Marks the path you're leaning toward, in amber |
| **Delete** | Removes the branch and everything under it |

Deleting leaves an **Undo** on offer for a few seconds, so a wrong Delete costs nothing. A branch fed by another card as well as this one stays put — it was never only this one's.

The panel has the same thing as **Delete branch**, and the `Delete` or `Backspace` key removes the card you are looking at — panel open or not, as long as the caret isn't in a text field. The key also removes whatever is selected on the canvas — including a connector, if you click one first. Shift+click to select several and delete them together. Deleting a branch takes its sub-branches and everything listed on it with it. The decision card itself cannot be deleted; **New** clears the board instead.

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

**Decision cards are clear from the start.** A decision is a fork, not a claim — the thinking that answers it belongs on the branches under it, so it never sits in the fog waiting for a paragraph. Options and outcomes are the ones that have to be written.

Also in the panel:

- **Gut read** — a quick emotional register, kept deliberately separate from the analysis. It's for what the scoring misses.
- **How likely does this feel** — on outcome cards only.
- **Lean this way** — the amber path. Amber is used for nothing else in the app, so where you're leaning is never ambiguous.

Press **Esc** or **Close** to dismiss the panel.

## 4. Weigh each branch on its own

Every branch has its own page. Open it with **Weigh** on the card's toolbar, or from the panel — the block reading *What's for it, what's against*, which also shows where the branch currently stands.

Two columns, and one line per thing:

- **What's for it** — *Better pay. They ship every week.*
- **What's against** — *Starting over on trust.*

Write them in your own words. There are no criteria to invent, and nothing has to apply to the other branches: this page is about this branch only.

**Rating a line is optional.** Beside each one are five steps, from *barely counts* to *decisive on its own*. Leave them alone and the line still counts — as one, so an unrated list behaves like a plain tally of pros against cons. Rate the ones where the size is the point. Clicking the step a line is already on takes the rating back off.

**Answer a line where it stands.** Under every pro is **But…**, and under every con **Even so…** — for the thing that comes straight back at it. *Better pay* ×4, answered by *rent there eats most of it* ×3, is a pro worth 1, not a pro of 4 and a new con of 3. The answer is written under the line it belongs to, in the other side's colour, and takes its weight off that line — never below zero. A line can hold several answers.

This is the difference between a list and an argument: a pro you already have a reply to shouldn't keep its full size just because you wrote it down first.

The bottom of the page keeps the running total: `net = for − against`, with the two bars showing which side is carrying weight.

**The map does not show that total.** A card carries a small two-tone strip — how the weight sits, for against against — and the count of lines on each side. That is a shape you can read at a glance and argue with; a number like *+6* is a verdict, and a verdict off four lines you wrote in a hurry is worth less than it looks. The total is one click away, on the page where the lines are on screen beside it.

**Back to the map** or **Esc** returns to the canvas, exactly where you left it.

## 4b. Compare the branches

Select the card the branches hang off — usually the root — and hit **Compare**. It needs at least two branches; it is disabled on a leaf.

Every branch gets a column: its net, then its pros and cons with what each counts after any answer, and those answers nested underneath. **Nothing is typed here.** The comparison is only ever a reading of the pages you already wrote, so the two can never disagree. **Weigh this branch** on any column takes you to that page to fix it.

The line in the footer says it in words:

> **Take the offer** is ahead by 5 — carried by *They ship every week*. 1 branch has nothing listed yet.

Three things to notice there:

1. **The margin.** A lead of 1 is noise. A lead of 8 is a decision.
2. **What's carrying it.** If the single line holding up the lead isn't something you actually care about, the rating is wrong — fix it on the branch page, not here.
3. **What's unweighed.** A standing that beats two branches nobody has listed anything for is not a standing.

If it comes out level, the footer says so. Usually that means something real is missing from one of the lists.

**Done** (or **Esc**) closes it and stamps the standing onto the card: *"Of the branches here, Take the offer leads by 5."*

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

## 6. When it's time to decide

**Decide** in the header puts the editing away. Same map, same cards — but no toolbars full of actions, no connector dots, no dragging, no Align, no Delete, and the question and every field go read-only. Nothing can be nudged while you are reading.

Clicking a card *reads* it: the name, the thinking, its case with both sides and any answers, the gut read, and any standing from Compare. Compare still opens; Export still works.

One thing stays writable, because it is the point: **Take this path** marks the branch you're going with, in amber. That's a decision, not an edit.

**Edit** switches back. The mode is remembered, so a finished decision opens finished.

## 7. Saving, sharing, starting over

- **Autosave.** Everything writes to your browser's local storage as you type. Close the tab and come back — it's there.
- **Export** downloads the whole decision as a `.decision.json` file. That's your backup and your way to move it to another machine or send it to someone.
- **Open** loads a `.decision.json` back in. It asks before replacing what's on screen.
- **New** clears everything and starts fresh. Export first if you want to keep the old one.

Local storage is per-browser and per-device. Nothing syncs. If it matters, export it.

**Auto / Dark / Light** cycles the theme; Auto follows your OS.

## Writing in Hebrew

Write in whatever language you think in. Every field that holds your words — the question, branch names, your thinking, every pro and con — sets its own direction from what you type, so Hebrew reads right-to-left and an English branch beside it still reads left-to-right. Mixed sentences keep their parts in the right order. The interface itself stays in English.

---

## Keyboard

| Key | Does |
| --- | --- |
| `Ctrl/Cmd + Enter` | Branch from the selected card |
| `Delete` / `Backspace` | Delete the selected card and its subtree, or the selected connector |
| `Esc` | Step back out: the branch page, then Compare, then the panel |
| `Ctrl/Cmd + Z` | Take back the last delete or align, whether the Undo bar is still up or not |
| `Enter` in a pro or con | Starts the next line; `Shift+Enter` breaks the line you're in |
| `Tab` / `Shift+Tab` | Move between cards and controls |
| Double-click card | Open its panel |
| Double-click canvas | New loose card there |

---

## A worked example

**"Should I leave the job?"**

1. Type the question. Select the root, **+ Branch** three times: *Take the offer*, *Stay and renegotiate*, *Leave with nothing lined up*.
2. Write into each one. Not a summary — the actual worry. *"Better pay, team ships weekly. But I'd be starting over on trust, and I'd miss the people here."* Clarity goes to 4/4.
3. Branch off *Take the offer* with two outcome cards: *It's the team they described* (likelihood 60%) and *It's the same job with a new logo* (40%). Write both.
4. **Weigh** each option in turn. Under *Take the offer*: for — *Better pay*, *I'd learn something again*; against — *Starting over on trust*, *An hour further from home*. Rate only the ones where the size matters: *I'd learn something again* at 5.
5. Do the same for the other two. Some lines will stay unrated, and that's fine — they still count.
6. Select the root, **Compare**. Read the footer. *Take the offer is ahead by 5 — carried by I'd learn something again.* That's the real reason. If seeing it in writing makes you flinch, that's information too.
7. **Done**, then **Lean here** on the branch you're going with. Export the file — in six months, it'll tell you what you actually knew at the time.

---

## When it isn't helping

- **Every branch comes out the same.** Your lines are too abstract. *"Quality of life"* doesn't discriminate; *"An hour further from home"* does.
- **The leader feels wrong.** Trust the flinch — it usually means something is missing from a list, or a line is rated for what you think you should care about rather than what you do. Fix the branch page, don't override it.
- **You can't write the note.** That's the finding, not a blocker. A branch you can't explain isn't one you've thought about yet.
