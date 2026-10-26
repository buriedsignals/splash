# Streamgraph — what you write

The bands, their inside-out order, the band names, the printed values in place of a value axis, the
type, the colours and the layout are already done: they come from the worked example
`proof/static-streamgraph-swiss-electricity` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's plate
says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

A streamgraph has no value axis: a band's thickness is its quantity and its position means nothing.
It suits several quantities that add up to a whole over consecutive years, none negative. The plate
prints the tracked band's first and last values and the first and last totals.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `keys` | The layers drawn: the `data.json` column names of the quantities stacked (at least two). |
| `labels` | `{ key: name }` for EVERY key — the name printed inside its band, in the story's language. |
| `tracked` | The key of the band the takeaway is about. It is drawn in the accent. |
| `readings` | One `{ year, <key>: value, … }` per year, every year from the first to the last, none skipped. |
| `excluded` | Years the data holds but the plate leaves out, `[{ year, why }]` (e.g. an incomplete last year); `[]` if none. Each year must be said in `source` or `limits`. |
| `rank` | Optional. When the takeaway says the tracked band became the Nth largest, N. The render recomputes the year it is first reached and refuses if it is lost in any later year. |
| `reachedIn` | Optional, with `rank`: the year it is first reached, COMPUTED. |
| `lastYearComplete` | Optional. `true` only if the source confirms a last year whose total falls by more than a sixth is complete. |
| `unit` | The unit printed beside values ("TWh", "t", "people"). |
| `format(v)` | How a value is printed, in the story's language. |
| `totalWord`, `colon` | The word before the totals line ("Total") and the year/value separator (" : " in French, ": " in English). |
| `title` | The headline: a string, or forms longest first (landscape takes the first, square and portrait the last). The FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst (string or forms, same rule): unit, scope, the limits the journalist named. |
| `reading` | The reading line (string or forms): thickness is quantity, position means nothing, no vertical axis. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bands (string, or a function of the readings). |
| `evidenceLevels` | 3. |
| `check()` | Throws if the data no longer supports the title. |

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
- A last year whose total falls by more than a sixth — probably partial: leave it out, list it in
  `excluded`, say it in `source`.
- With `rank`: a band that reaches the rank and loses it later, or a `reachedIn` that is not the year
  the data gives.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (a band unnamed, the wrong band
  in the accent, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
