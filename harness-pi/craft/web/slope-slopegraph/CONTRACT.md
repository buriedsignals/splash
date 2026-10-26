# Slope (web) — what you write

The page is already designed: it comes from the worked example `proof/web-slope-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. Two rails, one line per member from the left value to
the right value, the names and values in the gutters, the thread (one line or one pair) in the
accent, the thread pair's crossing ringed WHERE the two lines actually meet; the colours, the type
and the INTERACTION are done — every line answers hover, tap and Tab with what links its two ends
(its change, the rank of that change, who it passed), and a "level" control lets the reader lay any
line's own two values across both rails, so every other line is read against it, with a sentence
naming who it passed and who passed it. With JavaScript off the page is the complete static plate
and the control still works. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
lines and the WORDS of this story's page. `render-beat.mjs` (already in the folder) derives every
crossing, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `lines` | One `{ key, label, from, to, thread }` per line drawn: `from` is the value at the left rail, `to` at the right rail, `label` the name printed. 2 to 16 lines. |
| `thread` | `true` on the one line, or the one pair, the title is about. Drawn in the accent; every other line is muted. |
| `rails` | `{ left, right }`: what each rail is, e.g. `{ left: "2000", right: "2024" }`. |
| `subject` | The `key` of the line the takeaway is about (one of the thread lines). |
| `domain` | Optional `[low, high]`: the scale the rails share (default: from 0, or the lowest value, to a round top). |
| `format(v)` | How a value is printed in the gutters, with its unit ("95 %"). |
| `detail(r)` | The tooltip sentence for one line. Start with the label. |
| `levelLabel` | The control's legend ("Measure all sixteen against"). |
| `noneLabel` | The untouched option's words ("Each country on its own"). |
| `announce(r)` | What a screen reader hears for one line's option. Must contain `r.label`. |
| `note(r)` | The sentence shown under the control when that line is chosen. Must say who it passed: `r.passed.length` or every name in `r.passed`. |
| `crossingNote(c)` | Required when the thread is a pair whose lines cross between the rails: the sentence printed under the plate about that crossing (the ring sits on it). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what is measured, the unit, the scope, the limits; if lines were left out, how many of how many are drawn. |
| `reading` | One sentence telling the reader what they can do: hover or tab a line, choose a line in the control. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the lines (a string, or a function of the drawn lines). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title — tested against ALL the data, not only the lines drawn. |

`r` (one line) is `{ label, from, to, gain, rank, count, passed, passedBy, left, right }`: `gain` =
`to − from`; `rank` = the place of that gain among the `count` lines (1 = largest); `passed` = the
labels of the lines it was below at the left rail and is above at the right; `passedBy` = the labels
of the lines that did that to it; `left` / `right` = the rails' names.

`c` (the thread pair's crossing) is `{ above, below, gap, aboveFrom, aboveTo, belowFrom, belowTo,
pct, left, right }`: `above` = the label of the line that ends above, `below` = the one it passed;
`gap` = how far below it started (`belowFrom − aboveFrom`); `pct` = where along the way the two lines
meet, in percent of the distance between the rails.

## Reading the data

Rows of `data.json` are arrays; find columns by name. Example with neutral names:

```js
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("region"), col("year"), col("value")];
const at = (n, y) => Number(table.rows.find((r) => r[NAME] === n && Number(r[YEAR]) === y)[VALUE]);
const lines = names.map((n) => ({ key: n, label: n, from: at(n, 2000), to: at(n, 2024), thread: n === "A" || n === "B" }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `c`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- Keep labels short: every name is printed in both gutters, and a long one leaves the slope no room.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong line in the
  accent, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
