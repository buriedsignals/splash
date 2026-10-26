# Gantt — what you write

The rows, the spans on a date axis, the track behind them, the span labels, the open ends flush with
the right edge, the type, the colours and the layout are already done: they come from the worked
example `proof/static-gantt-top-ten-tenure` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

One row per entity, laid on an axis of WHOLE YEARS from `first` to `last`. Each row carries one or
more runs (from a year to a year); a row in two pieces has a gap, and the gap is drawn. A run still
going at `last` is OPEN and ends flush with the right edge. The rows the takeaway is about are drawn
in the accent; the others in a muted ink. Every row's label carries its years ("1990–2016",
"2006–").

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ key, label, runs }` per entity, in the order they are drawn top to bottom (e.g. by first year, then by length). `key` is the data's own name, `label` is printed. `runs` is `[{ from, to, open }]`: whole years, in order, with a gap of at least one year between two runs of the same row. `open: true` only for a run reaching `last` that is still running; a run reaching `last` MUST say `open: true` or `open: false`. |
| `subjects` | The `key`s of the rows the takeaway is about. They are drawn in the accent. |
| `first` / `last` | The axis's first and last year (integers). Every run falls inside them. |
| `spanLabel(row)` | The years printed after the row's name, from `row.runs`: `"1990–2016"`, `"1990, 1992–2005"`, `"2006–"` for an open run. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as ONE literal string (the render checks it). |
| `limits` | The standfirst, in forms, longest first: what presence on the plate means, the window, how many rows, the limits the journalist named. |
| `reading` | The reading line, in forms, longest first (position = when, length = how long; a bar at the right edge is still running; a hole is real). The layout drops it first. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the rows, the subjects and the gaps. |
| `evidenceLevels` | 3. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Find a column's index by
name (`data.columns.findIndex((c) => c.name === "…")`).

- If the data has a start and an end column per row, each data row is a run: group them by entity.
- If the data is a yearly table (one row per entity per year, or a ranking), collect each entity's
  years, then cut them into runs of consecutive years, as `beat.example.mjs` does.

A run whose start or end the data does not give cannot be drawn: leave it out and say so in the
standfirst.

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- In `check()`, test the count or the duration the takeaway states (`throughout.length !== 6`, a row's years added up), at the takeaway's precision.
- Every number in a sentence is computed from `data.json`, never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (title cut, wrong rows in the
  accent, wrong years), fix `beat.mjs` with a small `edit_file`, render and look again.
