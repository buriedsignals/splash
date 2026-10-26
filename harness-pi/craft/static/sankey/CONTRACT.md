# Sankey — what you write

The rails, the ribbons, the node labels with their totals, the accent on one flow, the type, the
colours and the layout are already done: they come from the worked example
`proof/static-sankey-electricity-sources` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

A sankey is two rails: `sources` on the left, `targets` on the right, and one ribbon per
`{ from, to }` pair between them. It has no axis, so every node prints its own total.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `sources` | The left rail, top to bottom: `{ key, label, total }`. Order them by something that means something (a family, a size), not the order of the columns. |
| `targets` | The right rail, top to bottom: `{ key, label, total }`. A target's `key` must differ from every source's `key`. |
| `flows` | One `{ from, to, value }` per ribbon: `from` is a source `key`, `to` a target `key`, `value` a number ≥ 0. One flow per pair. |
| `tracked` | `{ from, to }` — the keys of the ONE flow the takeaway is about. It is drawn in the accent; everything else stays neutral. |
| `unit` | The unit of the values ("TWh", "people", "€ m"). |
| `format(v)` | How a node total is printed, in the story's language (decimal comma or point). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: unit, scope, the limits the journalist named. |
| `reading` | One or two forms of a "how to read" line (what a ribbon is). The renderer may drop it when the frame is short. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text: what flows where, and the tracked flow's value. |
| `declaredSequence` | Optional: what orders the left rail ("family", "size"). |
| `evidenceLevels` | 3 (the tracked flow, its two nodes, the rest). |
| `check()` | Throws if the data no longer supports the title. |

## What the render refuses

- A node `total` that is not the sum of its own flows (conservation, on both rails). Compute each
  total from `flows` with a `reduce`, as the example does — or leave `total` out and it is computed.
- A negative flow: a ribbon has a width, not a sign. A net change is a diverging bar.
- Two flows for one pair: `data.json` holds several years or series — filter its rows to one.
- A flow whose `from` / `to` is not a node key; a node with no flow; a `tracked` pair with no flow.
- More nodes on a rail than the frame can label: draw fewer nodes (group the smallest into one
  "other" node, computed, and say so in the standfirst).

## Reading the data

A wide table (one row per target, one column per source) becomes flows with one `flatMap`: for
each source column, one flow per row. A long table (`from`, `to`, `value` columns) maps row by row.
Look up columns by name, never by position:

```js
const col = (name) => table.columns.findIndex((c) => c.name === name);
const rows = table.rows.filter((r) => Number(r[col("year")]) === 2024);
const flows = SOURCES.flatMap((s) => rows.map((r) => ({ from: s.key, to: r[col("region")], value: Number(r[col(s.key)]) })));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence — node labels are words in that language.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong ribbon in the accent,
  labels crowded, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
