# Parallel coordinates — what you write

The rails, each axis's own scale and ceiling, the polylines, the names at each line's highest
point, the type, the colours and the layout are already done: they come from the worked example
`proof/static-parallel-coordinates-electricity-mix` and the story's PALETTE.md and DIRECTION.md. You
write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS
story's plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

Each entity is ONE line crossing several vertical axes, one per measure; each axis has its own scale
from 0 to a rounded ceiling. Only two NEIGHBOURING axes show a relationship, so the axis order is the
argument: put the two axes the takeaway relates side by side (first if you can). The lines the
takeaway is about (the thread) are drawn in the accent; the rest are a muted field.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `axes` | The axes left to right, 3 to 9: `[{ key, name }]`. `name` is printed at the top of the rail. |
| `lines` | One `{ key, name, values }` per entity (3 to 30): `values` gives EVERY axis's value by axis key, zero or more, from `data.json`. One line per entity — filter to one year first. |
| `thread` | The `key`s of the 1 to 3 lines the takeaway is about. Drawn in the accent, named first. |
| `claimAxes` | The two axis keys the takeaway relates, e.g. `["nuclear", "wind"]`. They must be neighbours in `axes`. |
| `formatCeiling(v)` | Optional: how each axis's ceiling is printed at its top, with the unit (default `70 %`). |
| `ceilingStep` | Optional: the step the ceilings are rounded up to (default 10 when an axis tops 10). |
| `unit` | The line above the rails saying what every value is ("share of the country's electricity, in %, 2024"). |
| `threadNote` | One sentence under the rails saying what the coloured lines are. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: what a line is, what each axis measures, that each axis has its own scale, the limits the journalist named. |
| `reading` | One or two "how to read" sentences, longest first (only neighbouring axes compare; the order is a choice). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `{ lines, r }`). |
| `evidenceLevels` | 4. |
| `check({ lines, r })` | Throws if the data no longer supports the title. render-beat passes the lines and `r`, the correlation between the two `claimAxes` across all lines. |

## Reading the data

Each row of `data.json` is an array; find columns by name, never by position:

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const lines = data.rows
  .filter((r) => Number(r[col("year")]) === 2024)
  .map((r) => ({ key: r[col("code")], name: r[col("place")], values: Object.fromEntries(axes.map((a) => [a.key, Number(r[col(a.key)])])) }));
```

If the takeaway speaks of shares, compute each share from the row's total (every part, including
the ones not drawn as axes) and draw the share, not the raw value.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses ("the axis names do not clear each other", "the copy leaves the rails"), give shorter axis
  names or shorter title / standfirst forms. If the picture is wrong (wrong lines in the accent), fix
  `beat.mjs` with a small `edit_file`, render and look again.
