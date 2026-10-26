# Waterfall (bridge) — what you write

The floating bars, the connectors, the net-change span between the two outer totals, the labels
placed outside each bar's growing edge, the type, the colours and the layout are already done: they
come from the worked example `proof/static-germany-electricity-bridge` and the story's PALETTE.md and
DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and
exports what THIS story's plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

A bridge walks from an opening total to a closing total through signed steps that ADD UP: opening +
every step = closing. The render replays that arithmetic before drawing and refuses a bridge that
does not balance. If the pieces are shares of one moment rather than changes, this is the wrong chart.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `subject` | The name of what the bridge is about ("Germany"). |
| `steps` | The bars, in story order (never sorted by size): `{ label, value, kind }`. The FIRST and LAST are `kind: "total"` (the opening and closing levels, positive). Between them each step is `kind: "increase"` (value positive) or `"decrease"` (value negative). A middle `"total"` is allowed only where it equals the running level. |
| `format(v)` | How a value is printed, in the story's language (decimals, decimal comma or point). The render adds the `+` / `−` sign itself — give it the plain number. |
| `unit` | The unit the net-change span states ("TWh", "M€"). |
| `tickFormat(v)` | Optional. How an axis tick is printed; default the plain number. Ticks hold at most three characters — for values in the thousands, draw them in a larger unit. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what drove the change, the unit, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bridge. |
| `evidenceLevels` | 3. |
| `check()` | Throws if the data no longer supports the title. |

## Building the steps

Compute each step as (later minus earlier) of a group of columns, and the totals as the sum of ALL
the groups, so the bridge balances by construction:

```js
const opening = sum(first, ALL);
const closing = sum(last, ALL);
const steps = [
  { label: "2015", value: opening, kind: "total" },
  { label: "Group A", value: sum(last, A) - sum(first, A) },
  { label: "Group B", value: sum(last, B) - sum(first, B) },
  { label: "2024", value: closing, kind: "total" },
].map((s) => ({ ...s, kind: s.kind ?? (s.value >= 0 ? "increase" : "decrease") }));
```

Every column the totals add up must belong to exactly one step's group. Rows are arrays; read cells
by the column's index (`table.columns.findIndex((c) => c.name === name)`), never by name on the row.

## Rules

- Keep the steps in the order the story tells them; at most 12 bars (group the smallest).
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(opening - closing) === 143`, or to one decimal), never with strict equality on the raw subtraction.

- Every number in a sentence is computed from `data.json`, never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence or a label.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
