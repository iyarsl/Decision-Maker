# Examples

Real decisions, saved out of the app. **Open** in the header loads one back onto the canvas.

| File | What it is |
| --- | --- |
| `should-i-leave-the-army.decision.json` | Staying in the army against leaving, and what each of those opens up — 18 branches deep, written in Hebrew, with weighted pros and cons and one answered line. Doubles as the app's own test of right-to-left text at full size. |

A file is the whole document: question, cards, connections, and every branch's case. It carries a
`version`, and an older one is migrated on the way in.
