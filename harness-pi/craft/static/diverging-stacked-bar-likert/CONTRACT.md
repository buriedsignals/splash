# Diverging stacked bar (Likert) — what you write

The bars, the ramps, the neutral on the centre, the totals at the ends, the type, the colours and the
layout are already done: they come from the worked example `proof/static-diverging-stacked-electricity`
and the story's PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It
reads `data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the
folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

One row per entity (a country, a group of respondents, a question). Each row is a WHOLE (100 %),
split into levels on two sides of a centre line: the left side's levels (e.g. "disagree", "strongly
disagree"), one neutral level that straddles the centre half on each side (e.g. "neither"), and the
right side's levels ("agree", "strongly agree"). Each side's total is printed at its end.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ key, label, left, centre, right }` per row. `key` identifies the row (the data's own name), `label` is printed. `left` and `right` are arrays of levels `{ key, label, value }` ordered OUTWARD from the centre (the mildest level first, the most extreme last); `centre` is one level. `value` is the level's SHARE of the row in percent, so a row's levels add up to 100. Every row carries the same levels in the same order. Order the rows by the reading (e.g. from the largest left total). |
| `subject` | The `key` of the row the takeaway is about. It is drawn in the accent. |
| `leftName` / `rightName` / `centreName` | The names of the two sides and of the neutral, printed above the bars. |
| `unit` | `"%"`. |
| `format(v)` | How a share is printed (decimals, decimal comma or point for the language). |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what the shares are of, the year, the limits the journalist named. |
| `reading` | The reading line under the plot, in forms, longest first: each row is 100 %, the neutral straddles the axis, the lean reads at the longer side. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the rows and the subject's split. |
| `evidenceLevels` | 3. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Find a column's index by
name (`data.columns.findIndex((c) => c.name === "…")`), filter the rows to the one period or question
the takeaway is about, and turn each into a row of shares: add up the row's columns, then each
level's value is `cell / total * 100`. If the data already holds percentages that add up to 100, use
them as they are. Classify EVERY column of the mix into left, centre or right — a column left out
draws a partial row and the render refuses a row that does not add up to 100.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 68`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence — use the level's `label`.
- The neutral is a level that belongs to NEITHER side by definition (neither agree nor disagree; neither fossil nor renewable). If the data has no such level, this is not the right type.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (title cut, wrong row in the
  accent, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
