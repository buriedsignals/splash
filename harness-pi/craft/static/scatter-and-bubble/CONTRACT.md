# Scatter — what you write

The points, the axes, the declared break with its band, the type, the colours and the layout are
already done: they come from the worked example `proof/static-income-life-expectancy` and the
story's PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the
folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

A scatter's argument is the SHAPE of the cloud, not one point: no point is drawn in the accent. The
accent goes to the declared break — a threshold on the x axis that you declare — and the spread of y
on each side of it. **This kit draws no bubble size**: every point has one radius. A takeaway about a
third quantity (population, size) is not drawn by this kit; the render refuses a `size` field.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `points` | One `{ x, y }` per row that has BOTH measures, from `data.json` (at least 10). Leave out aggregates (world, regions) and rows missing either value. |
| `breakAt` | The declared threshold on the x axis (a number), or `null` for no break. Each side needs at least 3 points. |
| `belowNote` | Drawn left of the break: states how many points lie below it and the spread of y there (max − min), both COMPUTED. Required when `breakAt` is set. |
| `aboveNote` | Drawn right of the break: the count at or above it and their y spread, COMPUTED. |
| `xName`, `xQualifier` | The x axis name, and its subordinate part in parentheses ("(log scale)"), or `""`. |
| `yName`, `yQualifier` | The y axis name and its unit in parentheses ("(years)"), or `""`. |
| `xLog` | `true` for a logarithmic x axis (incomes, populations spanning orders of magnitude); every x must then be above 0. `false` for linear. |
| `xTicks` | Optional: the x tick values. On a log axis give round values across the range (500, 1000, 2000, 5000, …); leave it out on a linear axis. |
| `xTick(v)` | How an x tick is printed ("$30k", "30 %"), in the story's language. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: how many points, the year, the limits the journalist named (correlation is not causation, when it applies). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the cloud and the break. |
| `evidenceLevels` | 3 (the cloud, the break, the spread on each side). |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [X, Y] = [col("income"), col("outcome")];
const points = table.rows
  .map((r) => ({ x: Number(r[X]), y: Number(r[Y]) }))
  .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
```

Rows are arrays; look columns up by name, never by position. To compute a side's spread:
`const ys = points.filter((p) => p.x < breakAt).map((p) => p.y); const range = Math.max(...ys) - Math.min(...ys);`

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the axis qualifier or the standfirst — never as 0.0039. The y axis runs in tens: a y measure that spans less (a share 0.2 to 0.9) is drawn as a percentage.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(ratio) === 3`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written. The render refuses a `belowNote` / `aboveNote` whose count or spread is not the measured one.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (cloud squashed, break in the
  wrong place, a note cut), fix `beat.mjs` with a small `edit_file`, render and look again.
