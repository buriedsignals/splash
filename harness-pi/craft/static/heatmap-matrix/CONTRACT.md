# Heatmap (matrix) — what you write

The grid, the stepped colour ramp, the key with its printed breaks, the column heads grouped by
family, the row measure printed at the right, the bracket naming the top block of rows, the type, the
colours and the layout are already done: they come from the worked example
`proof/static-heatmap-europe-electricity` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

Rows (e.g. countries) crossed with columns (e.g. sources); each cell is coloured by the CLASS its
value falls in (the `breaks` are the class edges, printed under the grid). The columns are grouped
into families, each named once over its block. One number per row is printed at the right (`value`,
named by `valueHead`) and it orders the rows. The first rows — the block the takeaway is about — are
bracketed and named (`region`). About a dozen rows fit a landscape plate; the render refuses more
rather than shrinking the names.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `heads` | The columns, in the order drawn: `{ key, label, short, family }`. `label` is printed over the column; `short` (optional) is used on a narrow plate; `family` groups columns — a family's columns must sit side by side. |
| `familyShort` | Optional: `{ familyName: "Short." }`, the families' short names for a narrow plate. |
| `rows` | One `{ key, label, value, cells }` per row, in the order drawn (from the largest `value`). `cells` holds one number per head, in the heads' order. `value` is the row measure printed at the right. |
| `breaks` | The class edges of the ramp, in the cells' unit, strictly rising (e.g. `[2, 5, 10, 20, 40]` for shares in %): `n` breaks make `n + 1` classes. Space them where the cells actually are. |
| `region` | `{ from, to, label }`: the first and last row index (0-based) of the top block the takeaway is about, and the words drawn beside its bracket. |
| `valueHead` | The name printed over the right-hand column of row values. |
| `unit` | What a cell is, printed beside the key ("share of the country's generation"). |
| `format(v)` | How a value and a break are printed (decimals, unit sign, decimal comma or point). |
| `subject` | Optional: the `key` of the row the takeaway is most about; defaults to the region's first row. |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what a cell is, the period, the rule that selected the rows, the limits the journalist named. |
| `reading` | The reading line, in forms, longest first (what a row adds up to, the colour is a class, what orders the rows). The layout drops it first. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the grid, the region, and the cells the standfirst points at. |
| `evidenceLevels` | The number of classes (`breaks.length + 1`). |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Find a column's index by
name (`data.columns.findIndex((c) => c.name === "…")`). Each data row usually becomes a plate row, and
the columns you list in `heads` become its cells. If the takeaway speaks of shares, compute each cell
as a share of the row's total (`cell / total * 100`). A row the data reports nothing for (total 0) is
not a row of zeroes: drop it and say so.

When the data has more rows than the plate holds, SELECT them by a rule you state in the standfirst
(e.g. "every country above the threshold, plus the largest producers") — and run `check()` over the
WHOLE data, not over the drawn rows, so the selection cannot make the headline true.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 94`, or to one decimal), never with strict equality on the raw division. A count the title states ("seven countries") is checked as a count.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence — use the head's `label`.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (title cut, wrong block
  bracketed, a row name in the data's language instead of the story's), fix `beat.mjs` with a small
  `edit_file`, render and look again.
