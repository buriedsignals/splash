# Scatter (web) — what you write

The page is already designed: it comes from the worked example
`proof/web-scatter-income-life-expectancy` and the story's PALETTE.md and DIRECTION.md. One mark per
row, all the same size (no third variable is encoded), on a LOGARITHMIC x axis whose ends are the
data's own; the declared threshold drawn in the accent with the band of y the points at or above it
span, and a sentence about that band; the colours, the type and the INTERACTION are done. A
"measured against" control lays two references across the cloud at one case's own x and y (never in
the accent), rings its point, writes its name, and prints one sentence with its ranks and the counts
that make the claim checkable from there — how many points higher on x sit lower on y, how many
lower on x sit higher. The cases are DERIVED by a rule a reader can check: the heaviest point
(`weight`) of each `group`, ordered along x. Every mark answers hover, tap and Tab with its own
reading. With JavaScript off the page is the complete static plate and the control still works (CSS
only). You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
points and the WORDS. `render-beat.mjs` (already in the folder) computes the scale, the band, the
cases, every rank and count, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `points` | One `{ key, label, x, y, group, weight, …any other field }` per row with BOTH measures (at least 10), from `data.json`. Every `x` above 0 and spanning at least a factor of 10 (the axis is logarithmic). `group` and `weight` derive the control's cases (e.g. region and population). Leave out aggregates and rows missing a value. |
| `cases` | Optional: 2 to 8 point keys to offer instead of the derived rule — only when the points carry no group/weight. |
| `breakAt` | The declared threshold on x (a number inside the data's range). Each side needs at least 3 points. |
| `yUnit` | Optional: what y is measured in ("years"). |
| `format(v)` | Optional: how a y value is printed. |
| `xTick(v)` | How an x tick is printed ("30,000 $"). The ticks are the data's two ends plus 1 and 3 × each power of ten between them. |
| `thresholdLabel(v)` | The threshold's name on the plot ("30,000 $ per person"). |
| `bandNote(b)` | The sentence under the band. `b` is `{ breakAt, above, below, low, high, spread, belowLow, belowHigh, belowSpread, total }`: counts on each side, and the y range (`low`–`high`, `spread`) at or above the threshold, (`belowLow`–`belowHigh`, `belowSpread`) below it. |
| `detail(p)` | The tooltip of one point (see the reading below). Start with its label. |
| `levelLabel` | The control's legend ("Measured against"). |
| `noneLabel` | The untouched option ("The whole cloud"). |
| `announce(c)` | What a screen reader hears for one case. Must contain `c.label`. |
| `note(c)` | The sentence shown under the control when that case is chosen: its values, ranks and the counts. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: how many points, the year, what each axis is, THAT THE X AXIS IS LOGARITHMIC, the limits the journalist named (correlation is not causation, when it applies). |
| `reading` | One sentence telling the reader what they can do: choose a case; hover, tap or tab a point. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the same object `check()` receives). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check({ band, cases, points })` | Throws if the data no longer supports the title. `band` as in `bandNote`; `cases` and `points` = the readings below. |

A point's reading (`p` in `detail`, `c` in `announce` / `note`, and in `check()`) is
`{ label, x, y, group, weight, point, xRank, yRank, of, higherX, higherXLowerY, lowerX, lowerXHigherY }`:
`point` = its object from `points` (any extra field you gave it); `xRank` / `yRank` = its place from the
top on each axis among `of` points; `higherX` = how many points have a larger x, of which
`higherXLowerY` have a smaller y; `lowerX` = how many have a smaller x, of which `lowerXHigherY`
have a larger y.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const points = data.rows
  .map((r) => ({ key: r[col("code")], label: r[col("place")], x: Number(r[col("income")]), y: Number(r[col("outcome")]), group: r[col("area")], weight: Number(r[col("residents")]) }))
  .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > 0);
```

Filter to ONE year first, so each row is one point.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(band.spread * 10) / 10 === 13.9`), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`p`, `c`, `b`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language` — point labels included (translate names the table holds in another language). Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (a sentence cut, a
  wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
