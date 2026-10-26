# Treemap — what you write

The squarified layout, the cell-count ladder (every drawn cell carries its own figure; what does not
fit is folded into two remainders, one for the thread and one for the rest), the three registers per
cell, the type, the colours and the layout are already done: they come from the worked example
`proof/static-treemap-europe-capacity` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

A treemap shows parts of ONE whole by area. The accent marks a **thread** — the cells the takeaway
is about — and the thread must NOT contain the largest cell (the render refuses: the colour would
read as a highlight on the maximum). If the takeaway is about the largest item, the right chart is a
bar chart, not this one.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `cells` | One `{ name, value, thread, count }` per item. `value` is the item's quantity (a positive number: it is the cell's area). `thread: true` on the cells the takeaway is about, `false` on the others. `count` is optional: a second number about the item (e.g. how many sites the value is spread over), printed by `basis`. When data.json has several rows per item, ADD THEM UP into one cell per item. |
| `format(v)` | The figure printed in a cell, with its unit (`"34,6 GW"`, `"1.2 bn"`), in the story's language. Also prints the remainders' sums. |
| `basis(n)` | Optional. The quiet third line of a cell, from its `count` (`"704 stations"`). Leave it out when there is no count. |
| `unit` | The caption above the plate: what a cell's area is ("installed low-carbon capacity"). |
| `threadNote` | The line under the plate saying what the coloured cells are, with their count computed. |
| `restLabel` | Plural noun naming the folded cells outside the thread: it is drawn as "<n> <restLabel>" ("other countries"). |
| `threadRestLabel` | Plural noun naming the folded thread cells: "<n> <threadRestLabel>" ("countries that tipped"). |
| `reading` | Optional. A reading note in forms, longest first ("Reading: each cell carries its figure because areas do not compare at a distance."). It is dropped first when space is short. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what an area is, the total, the scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the cells. |
| `evidenceLevels` | 4. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ITEM, VALUE] = [col("item"), col("value")];
const by = new Map();
for (const r of table.rows) by.set(r[ITEM], (by.get(r[ITEM]) ?? 0) + Number(r[VALUE]));
```

Rows are arrays; read cells by the column's index, never by name on the row.

## Rules

- A cell's value must be positive. Leave out rows with zero or negative values, and say so in the standfirst.
- `thread` must be true on at least one cell and false on at least one, and false on the largest cell.
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039. (A treemap of rates is rarely right: areas should add up to a whole.)
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a share of a total, the cells are the parts of that total.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 77`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (title cut, wrong cells in
  the accent, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
