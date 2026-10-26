# Radar (spider) — what you write

The wheel, the circular rings, the labelled ceiling, the two polygons, the values at each spoke's
end, the type, the colours and the layout are already done: they come from the worked example
`proof/static-radar-electricity-mix` and the story's PALETTE.md and DIRECTION.md. You write ONE file,
`beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's plate
says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What this radar draws

TWO items — the subject (drawn in the accent) and the one item the takeaway compares it to (muted
ink) — across three to ten spokes. Every spoke is a SHARE, in %, of the same whole: that item's own
total across all the spokes, so each item's shares add up to 100. The render refuses anything else:
more items (use small multiples), spokes in different units (that is parallel coordinates), signed
values (a diverging bar), shares that do not add up to 100.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `items` | The two item names as printed, e.g. `["Item A", "Item B"]`, in the order of every spoke's `shares`. |
| `subject` | The item the takeaway is about, spelled exactly as in `items`. It is drawn in the accent. |
| `spokes` | One `{ key, label, family, shares }` per spoke, clockwise from twelve o'clock. `shares` = one % per item, in the order of `items`, COMPUTED as value / (sum of that item's spoke values) × 100. |
| `family` | (in each spoke) The group the spoke belongs to; spokes of one family must be adjacent — the order is an editorial decision, stated in `reading`. |
| `format(v)` | How a share is printed, without the `%` sign, in the story's language (decimal comma or point). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what the shares are a share of, the year, the limits the journalist named. |
| `reading` | A function `(ceilingLabel) => [forms…]`, longest first: the reading line — what one spoke is a share of, the spoke order, and the outer ring's value (`ceilingLabel`, computed by the render). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the two shapes, with the shares it names computed. |
| `evidenceLevels` | 3. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows are arrays: find a column's index by name, then the row of each item, then compute each spoke's
share from that row.

```js
const col = (name) => table.columns.findIndex((c) => c.name === name);
const row = table.rows.find((r) => r[col("name")] === "Item A" && Number(r[col("year")]) === 2024);
const values = SPOKES.map((s) => Number(row[col(s.column)]));
const total = values.reduce((a, b) => a + b, 0);
const shares = values.map((v) => (v / total) * 100);
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- Include every category of the whole in the spokes (merge the smallest into one "other" spoke if there are more than ten), or the shares will not add up to 100.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong item in the accent,
  a spoke label cut, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
