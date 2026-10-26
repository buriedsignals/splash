# Marimekko (mosaic plot) — what you write

The variable-width columns, the stacked bands, the shares in the cells, the band names in the right
gutter, the brace and total under each column, the type, the colours and the layout are already
done: they come from the worked example `proof/static-marimekko-electricity-mix` and the story's
PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the
folder) computes the totals and shares and draws them.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

A marimekko is a set of 100 % stacked columns whose WIDTH is each column's total: a band's area is
a quantity. Every column stacks the same bands in the same order, bottom to top; one ramp of the
accent runs along that order, so the order must mean something (e.g. fossil → nuclear → renewables).
The `tracked` band — the one the takeaway is about — has its shares set in bold and its name in ink.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `columns` | One `{ key, label, values }` per column (2 to 8): `label` is the name printed above it, `values` an object giving EVERY band's value by band key (`0` where there is none), from `data.json`. Do not give totals: render-beat adds the bands. No column may be under 3 % of the whole. |
| `bandOrder` | The bands bottom to top, 2 to 10: `[{ key, label, family }]`. `label` is printed in the gutter. |
| `tracked` | The `key` of the band the takeaway is about. Put it at the bottom of `bandOrder`. |
| `unit` | The unit of the values ("TWh"). |
| `widthName` | The sentence under the braces naming what a width is ("Width: total generation, in TWh"). |
| `format(v)` | How a column total is printed under its brace, in the story's language. |
| `percent(share)` | Optional: how a cell's share (0–1) is printed; return `""` for a share too small to print. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first. Every form says that the WIDTH is the total and the height the mix — the one thing a reader of this form must be told. |
| `reading` | One to three "how to read" sentences, longest first. |
| `mergeNote(a, b)` | Needed only for square/portrait: there the two narrowest columns share one column; return the sentence (with labels `a` and `b`) that says so. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of what render-beat computed — see `check`). |
| `evidenceLevels` | 3. |
| `check({ columns, grand, trackedTotal, trackedShare, holders })` | Throws if the data no longer supports the title. render-beat passes the columns with their `total`, the whole (`grand`), the tracked band's total and share of the whole, and `holders`: `[{ key, label, value }]` of the tracked band per column, largest first. |

## Reading the data

Each row of `data.json` is an array; find columns by name, never by position. When each band is a
column of the table:

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const columns = data.rows
  .filter((r) => Number(r[col("year")]) === 2024)
  .map((r) => ({ key: r[col("place")], label: r[col("place")], values: Object.fromEntries(bandOrder.map((b) => [b.key, Number(r[col(b.key)])])) }));
```

When the table is long (one row per place per band), build each column's `values` by reading the
rows of that place. Filter to ONE year (or one survey) first.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(trackedShare * 100) === 12`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses ("the narrowest column is … px", "a sliver too narrow"), put the smallest columns together
  in one named column or leave them out and say so. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
