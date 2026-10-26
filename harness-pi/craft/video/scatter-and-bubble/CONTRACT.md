# Scatter (video) — what you write

The video is already designed: it comes from the worked example `proof/video-scatter-income-life-expectancy`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (20 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then every point
stands in ONE column at the plot's left, each at its own y — the y spread is read before x exists;
the points unfold along x, smallest x first, each keeping its height, while a count climbs; the
declared break is ruled down; the cloud folds against it into two columns, one per side, and a bar
grows beside each over its y span, with its value; copies of the short bar (the side at or above the
break) fly onto the long bar (the side below) and stack until they fill it — the ratio is counted,
then named («3 fois»); the cloud unfolds back, the copies go, the bars stay, and the credit comes
in on one line. There is no standfirst and no sentence on screen. You do not change any of that.

**This kit draws no bubble size**: every point has one radius (a `size` field is refused). And it
tells ONE argument: "beyond the break, y spreads N times less". The band below the break must be
the wider one, and its spread must be close to a whole number of times the band above
(within 0.15, between 2 and 8). Any other shape of data is refused.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes the
two spans, the counts and the number of copies, lays the frames out, renders eleven stills, prints
`look at: <png>`, then renders the mp4 (about two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `points` | One `{ x, y }` per row that has BOTH measures, from `data.json` (at least 10). Leave out aggregates (world, regions) and rows missing either value. An optional `label` is kept but not drawn. |
| `breakAt` | The declared threshold on the x axis (a number). Each side needs at least 3 points. |
| `xLog` | `true` for a logarithmic x axis (incomes, populations spanning orders of magnitude; every x above 0), `false` for linear. |
| `xTicks` | Optional: the x tick values (on a log axis round values: 500, 1000, 2000, 5000, …). Default: 1-2-5 steps on a log axis, round steps on a linear one. |
| `yTicks` | Optional: the y tick values, increasing; every y must lie between the first and the last. Default: tens from the least y to the most. |
| `xTick(v)` | How an x tick is printed ("$30k", "30 %"). |
| `yTick(v)` | Optional: how a y tick is printed. Default: the number. |
| `xName` | The x axis name, printed at the right of the bottom row ("GDP per capita"). |
| `yName` | The y axis name in one or two forms, longest first ("Life expectancy, in years", "Life expectancy"). |
| `thresholdLabel(v)` | The break's value as printed over the rule ("30,000 $"). It is handed `breakAt`. |
| `countLabel(n)` | The climbing count ("47 countries"). It is handed every count from 0 to the number of points. |
| `spanLabel(v)` | A span's value, printed over its bar ("41 years"). It is handed each side's spread (max − min of y), computed. Round it as the title does. |
| `timesLabel(n)` | The ratio named once the copies have stacked ("3 times"). It is handed the number of copies (the ratio rounded). |
| `source` | The credit line in one to three forms, longest first, exactly as the storyboard records it. It must fit on one line beside `xName`. |
| `lang` | Optional: the story's language tag ("fr", "en"). |
| `evidenceLevels` | Optional, 4. |
| `check()` | Throws if the data no longer supports the title. |

Every label function is handed the number the render computed: print THAT number (the render
refuses a `spanLabel` that prints the same text for both spans, a `countLabel` that ignores its
count, or a `timesLabel` without its number).

The render refuses, saying what to change, when:
- fewer than 10 points, a point with a size, an x at or under 0 on a log axis;
- a y outside `yTicks`, or a cloud so flat on its y axis it would read as a band;
- `breakAt` leaves fewer than 3 points on a side;
- the band above the break is the wider one, or the ratio of the two spans is under 2, over 8, or
  more than 0.15 from a whole number — this argument does not hold for that data; another type or
  the static format must tell it;
- a word does not fit the frame or sits on a dot (shorten the labels, the axis names, the source).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [X, Y] = [col("income"), col("outcome")];
const points = data.rows
  .map((r) => ({ x: Number(r[X]), y: Number(r[Y]) }))
  .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
const spread = (keep) => {
  const ys = points.filter(keep).map((p) => p.y);
  return Math.max(...ys) - Math.min(...ys);
};
const ratio = spread((p) => p.x < BREAK) / spread((p) => p.x >= BREAK);
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the axis name — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(ratio) === 3`, or to one decimal), never with strict equality on the raw division.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole cloud with the break and its two bars). If the render refuses, read its
  message and fix `beat.mjs`. If the picture is wrong (a word cut, the break in the wrong place, a
  wrong span), fix `beat.mjs` with a small `edit_file`, render and look again.
