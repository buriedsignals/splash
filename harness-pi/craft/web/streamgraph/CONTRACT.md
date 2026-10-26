# Streamgraph (web) — what you write

The page is already designed: it comes from the worked example `proof/web-streamgraph-swiss-electricity`
and the story's PALETTE.md and DIRECTION.md. The layers stacked on a centred, floating baseline, the
names inside the thick bands, the two totals, the ring at the year the tracked layer reaches its
rank, the colours, the type and the INTERACTION are done — every year answers hover, tap and Tab
with its whole composition in rank order, and a "floor" control lets the reader lay one layer flat:
the stream shears until that layer's bottom edge is straight, and an axis opens for it alone. Which
layers may be laid flat is computed (a layer too thin to carry two graduations is not offered). With
JavaScript off the page is the complete static stream and the control still works. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
layers and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes the
stack, the rank, the shears and the axes, draws the page, checks it in a real browser and prints
`look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `keys` | The layers drawn, in stacking order (the first at the bottom): the `data.json` column names (2 to 9). |
| `labels` | `{ key: name }` for EVERY key — the layer's name in the story's language (legend, inside the band, tooltip, pill). |
| `tracked` | The key of the layer the takeaway is about. |
| `readings` | One `{ year, <key>: value, … }` per year, every year from the first to the last, none skipped. |
| `rank` | The place the tracked layer reaches (3 = third largest). The render finds the first year it reaches it, rings it there, and refuses if it is lost in a later year. |
| `reachedIn` | Optional: that year, COMPUTED. The render refuses if the data gives another. |
| `lastYearComplete` | Optional. `true` only if the source confirms a last year whose total falls by more than a sixth is complete. |
| `unit` | The unit ("TWh"), printed after the totals and the top graduation. |
| `format(v)` | How a value is printed in the tooltip and the note (enough decimals to tell small layers apart). |
| `formatTick(v)` | Optional: how a graduation is printed (default `format`). |
| `formatTotal(v)` | Optional: how the two totals are printed (default `format`). |
| `colon` | Optional: between a total's year and its value (default " : " in French, ": " otherwise). |
| `detail(y)` | The tooltip sentence for one year. `y` is `{ year, total, ranked }`, `ranked` = `[{ name, value }]` largest first. Start with the year. |
| `crossingLabel(c)` | The words beside the ring. `c` is `{ year, rank, name }`. Must state the year. |
| `floorLabel` | The control's legend, one or two words ("Floor"). |
| `noneLabel` | The untouched option's words ("Silhouette"). |
| `optionLabel(name)` | Optional: a layer's pill words (default: its name, capitalised). |
| `announce(o)` | What a screen reader hears for one layer's option. Must contain `o.label`. |
| `note(o)` | The sentence shown under the control when that layer is laid flat. Must state `format(o.last.value)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: unit, scope, the limits the journalist named (and any year left out). |
| `reading` | One sentence telling the reader what they can do: hover or tab a year, lay a layer flat. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the stream (a string, or a function of the readings). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

`o` (one layer laid flat) is `{ name, label, first, last, peak, trough, move, share }`: `first` and
`last` = `{ year, value }` at the two ends; `peak` / `trough` = `{ year, value }` of its highest /
lowest year when that is NOT an end (else `null`); `move` = `last.value − first.value`; `share` =
percent of the last year's total. `label` is given to `announce` only.

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads one column per year, by name — call it once per
layer and join on the year instead of writing filters:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const keys = ["source_a", "source_b", "source_c"];
const byKey = Object.fromEntries(keys.map((k) => [k, new Map(series(table, { x: "year", y: k, where: { region: "All" }, to: 2024 }).map((p) => [p.year, p.value]))]));
const years = [...byKey[keys[0]].keys()];
const readings = years.map((year) => ({ year, ...Object.fromEntries(keys.map((k) => [k, byKey[k].get(year)])) }));
```

When the data is long (one row per year and category), call `series` once per category with
`where: { category: "<value>" }` and `y` the value column, and use the category values as keys.

## What the render refuses

- A key without a label, a tracked key not in `keys`, a cell that is not a number, two readings for
  one year, a skipped year, a negative value (a stream cannot stack it: use a line or a diverging bar).
- A last year whose total falls by more than a sixth — probably partial: leave it out and say it in
  `source` or `limits`.
- A tracked layer that never reaches `rank`, or reaches it and loses it later.
- Fewer than two layers thick enough to carry an axis (group thin layers into one).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`y`, `c`, `o`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- Keep `crossingLabel` short (under ~40 characters): it sits on the plot.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (a sentence cut, a
  wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
