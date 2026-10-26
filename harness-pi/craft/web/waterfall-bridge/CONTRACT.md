# Waterfall / bridge (web) — what you write

The page is already designed: it comes from the worked example `proof/web-waterfall-germany-bridge`
and the story's PALETTE.md and DIRECTION.md. A bridge from one named level to another, every move
drawn from where the last one landed, connectors between them, the rising move in the accent; the
axis, the colours, the type and the INTERACTION are done — every bar answers hover, tap and Tab with
what no withdrawal can change (its size, its share of all movement, the closing level it would leave
behind), and a "withdraw" control lets the reader take one move back out: it empties to an outline,
the moves after it re-step from the new level and the closing bar is redrawn at the recomputed total.
With JavaScript off the page is the complete static bridge and the control still works. You do not
change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
steps and the WORDS of this story's page. `render-beat.mjs` (already in the folder) checks that the
bridge balances, walks every counterfactual bridge, draws the page, checks it in a real browser and
prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `steps` | The bars, in story order (never sorted by size): `{ label, value, kind }`. The FIRST and LAST are `kind: "total"` (the opening and closing levels, positive). Between them, 2 to 8 moves, each `kind: "increase"` (value positive) or `"decrease"` (value negative). No middle totals. The moves must add up to closing − opening. |
| `unit` | The unit ("TWh", "M€"), used in your sentences. |
| `format(v)` | How a value is printed, in the story's language. Give it the plain number: the render adds the `+` / `−` sign itself on the moves. |
| `detail(s)` | The tooltip sentence for one move. `s` is `{ label, value, signedValue, share, without, closing, first, last }`: `signedValue` = the value with its sign, as printed on the bar; `share` = percent of all movement (the sum of every move's size); `without` = where the closing level lands if this move is taken out; `closing` = the real closing level; `first` / `last` = the two levels' labels. Start with the label. |
| `levelDetail(l)` | The tooltip sentence for the opening or closing bar. `l` is `{ label, value, isOpening, net, signedNet, first, last }` (`net` = closing − opening). |
| `withdrawLabel` | The control's legend ("Take one step out"). |
| `noneLabel` | The untouched option's words ("None"). |
| `announce(o)` | What a screen reader hears for one move's option. Must contain `o.label`. |
| `note(o)` | The sentence shown under the control when that move is taken out. Must state `format(o.without)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what the two levels are, what the moves group, the unit, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: take a step out, hover or tab a bar. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bridge. |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

`o` (one move taken out) is `{ label, value, signedValue, without, closing, netWithout, net,
following, first, last }`: `without` = the recomputed closing level; `netWithout` = `without −
opening`; `net` = the real `closing − opening`; `following` = how many moves come after it (they
re-step from the new level; 0 means only the closing bar changes).

The axis prints its ticks as bare numbers of at most three digits: when the levels are in the
thousands, draw them in a larger unit (and say so in `unit` and `limits`).

## Building the steps

Compute each move as (later minus earlier) of a group of columns, and the levels as the sum of ALL
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

Every column the levels add up must belong to exactly one move's group. Rows are arrays; read cells
by the column's index (`table.columns.findIndex((c) => c.name === name)`), never by name on the row.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`s`, `l`, `o`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (a sentence cut, a
  wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
