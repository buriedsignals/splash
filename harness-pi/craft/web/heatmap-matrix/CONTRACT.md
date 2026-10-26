# Heatmap (matrix, web) — what you write

The page is already designed: it comes from the worked example `proof/web-heatmap-europe-electricity`
and the story's PALETTE.md and DIRECTION.md. The grid, the single-hue stepped ramp and its key, the
numbers printed in the top class's cells, the colours, the type and the INTERACTION are done — a
floor control lets the reader raise the floor under the grid and watch which cells survive (the
others leave, their empty seats stay drawn, the key never moves), with a sentence per band saying how
many cells remain and how much of each row the survivors still account for; every cell answers
hover, tap and Tab with its exact value and its row's rank for that column. With JavaScript off the
page is the complete static grid, and the control still works. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
grid and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
reading, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

Rows (e.g. countries) crossed with columns (e.g. sources), at most 16 rows and 12 columns; each cell
is coloured by the CLASS its value falls in (`breaks` are the class edges, shown in the key above the
grid). Rows and columns are drawn in YOUR order: order rows by the measure the takeaway ranks, and
group columns so the pattern the takeaway names is a shape the reader sees. One paragraph under the
grid (`annotation`) names that pattern.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `heads` | The columns, in the order drawn: `{ label }` (the words printed under the column; keep them short). You may add other fields — `detail(c)` receives the head back. |
| `rows` | One `{ label, cells }` per row, in the order drawn. `cells` holds one number per head, in the heads' order. You may add other fields (amounts, totals) — `detail(c)` receives the row back. |
| `breaks` | The class edges of the ramp, in the cells' unit, strictly rising, 2 to 7 of them (e.g. `[1, 5, 15, 30, 50]` for shares in %): `n` breaks make `n + 1` classes. Space them where the cells actually are. |
| `unit` | The cells' unit sign ("%"), printed at both ends of the key; `""` for none. |
| `formatBreak(v)` | How a break is printed in the key ("0,5", "5"). |
| `format(v)` | How a value is printed inside a cell of the top class (e.g. no decimals). |
| `printFrom` | Optional: cells at or above this value print their number. Default: the last break. |
| `detail(c)` | The tooltip sentence for one cell. `c` is `{ rowLabel, colLabel, value, rank, count, row, head, colIndex }`: `rank` = this row's rank among all rows for this column (1 = largest), `count` = number of rows, `row` / `head` = your own objects, `colIndex` = the column's index in `heads`. Name the row and the column: every cell must answer differently. |
| `bands` | The floors the reader can raise, at least two numbers strictly rising (e.g. `[5, 15, 25]`). At every band, every row must keep at least one cell. |
| `filterLabel` | The control's legend ("Keep only shares of at least"). |
| `allLabel` | The untouched option's words ("All shares"). |
| `bandLabel(t)` | A band's option words, from its floor `t` ("5 %"). Each band's label must be distinct. |
| `bandNote(b)` | The sentence shown when a band is chosen. `b` is `{ threshold, label, kept, total, columnsKept, columnCount, low, high, fewest, most }`: `kept` of `total` cells survive, on `columnsKept` of `columnCount` columns; `low` / `high` = the row whose surviving cells add up to the least / most (`{ name, covered, cells }`, `covered` = the sum of its surviving cells, `cells` = how many survive); `fewest` / `most` = the row with the fewest / most surviving cells (same shape). Must state `b.kept`. |
| `annotation` | One paragraph under the grid naming the pattern the takeaway is about (which rows, which columns); its numbers computed. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a cell is, the period, the rule that selected the rows, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: raise the floor; hover, tap or tab a cell. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the grid and its pattern. |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Each data row usually
becomes a grid row, and the columns you list in `heads` become its cells. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const heads = [{ key: "part_a", label: "A" }, { key: "part_b", label: "B" }, { key: "part_c", label: "C" }];
const rows = data.rows
  .map((r) => {
    const amounts = heads.map((h) => Number(r[at(h.key)]));
    const total = amounts.reduce((a, b) => a + b, 0);
    return { label: r[at("region")], amounts, total, cells: amounts.map((v) => (v / total) * 100) };
  })
  .filter((r) => r.total > 0)
  .sort((a, b) => b.cells[0] - a.cells[0]);
```

If the takeaway speaks of shares, compute each cell as a share of the row's total. A row the data
reports nothing for (total 0) is not a row of zeroes: drop it and say so. When the data has more rows
than the grid holds, SELECT them by a rule you state in the standfirst — and run `check()` over the
WHOLE data, so the selection cannot make the headline true.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 94`, or to one decimal), never with strict equality on the raw division. A count the title states ("seven countries") is checked as a count.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`c`, `b`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence — use the head's `label`.
- The page must fit a phone screen without scrolling: if the browser check reports "no vertical
  scroll inside the visual" or "the source line is on screen", shorten `reading`, `annotation` or
  `limits` by a line.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (rows in the wrong
  order, a row name in the data's language instead of the story's, a wrong number), fix `beat.mjs`
  with a small `edit_file`, render and look again.
