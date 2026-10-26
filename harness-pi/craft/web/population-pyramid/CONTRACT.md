# Population pyramid (web) — what you write

The page is already designed: it comes from the worked example
`proof/web-population-pyramid-switzerland` and the story's PALETTE.md and DIRECTION.md. The bands
(youngest at the foot), the two halves drawn back to back from a centre line (left neutral, right in
a tint of the accent), the widest band named in the gutter, the round axis, the colours, the type
and the INTERACTION are done. A "fold one half" control lays one half's silhouette over the other as
a solid staircase, offered both ways round: wherever the outline juts past the bar it lies on, the
folded half leads that band; a chip names the band where it crosses. Every band answers hover, tap
and Tab with both counts, its total, the gap between the halves and its share of the population.
With JavaScript off the page is the complete static pyramid and the control still works (CSS only).
You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
bands and the WORDS of this story's page. `render-beat.mjs` (already in the folder) finds the widest
band, who leads each band, where the lead changes, draws the page, checks it in a real browser and
prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `bands` | One `{ band, left, right }` per age band (5 to 30), from `data.json`, YOUNGEST FIRST (the foot of the pyramid). `left` and `right` are the two halves' counts, never negative. One year, one population. |
| `leftName` | The left half's name ("men"), in the legend and the sentences. At least one Latin letter or digit, no quote. |
| `rightName` | The right half's name ("women"). |
| `unit` | Optional: what is counted ("people"). |
| `format(v)` | Optional: how a count is printed. |
| `tickFormat(v)` | Optional: how an axis tick (a positive count) is printed. Default: `175000 → "175k"` when the scale reaches 10,000, else the bare number. |
| `peakLabel(p)` | The note beside the widest band, under 40 characters ("55-59: 669,962 people"). `p` is a band reading (below). |
| `detail(b)` | The tooltip of one band. `b` is `{ band, left, right, total, share, gap, leader, isPeak, isYoungest }`: `share` = % of the whole population, `gap` = the difference between the halves, `leader` = the name of the larger half, or null on a tie. Start with the band. |
| `foldLabel` | The control's legend ("Fold one half"). |
| `noneLabel` | The untouched option ("None"). |
| `foldPill(f)` | The pill of one option ("the men"). |
| `announce(f)` | What a screen reader hears for it; must contain the pill's words. |
| `note(f)` | The sentence shown under the control when that half is folded. |
| `crossingText(f)` | The chip printed at the crossing band; must name that band (`f.crossing.band`). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: population, year, band width, which half is which side, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: fold a half; hover, tap or tab a band. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the same object `check()` receives). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check({ bands, widest, youngest, runs, crossings, total })` | Throws if the data no longer supports the title. `bands` = every band reading, `widest` / `youngest` = those bands' readings, `runs` and `crossings` as below, `total` = the whole population. |

The fold reading `f` (given to `foldPill`, `announce`, `note`, `crossingText`) is about the half
being folded: `{ name, host, first, last, crossing, crossings, runs, ahead, behind, widestGap, total, hostTotal }`
— `name` = the folded half, `host` = the half it is laid on, `first` / `last` = the youngest and oldest
bands, `crossing` = `{ band, gap, leader }` at the FIRST band where the lead changes, `crossings` =
every band where it changes, `ahead` / `behind` = how many bands the folded half leads / trails,
`widestGap` = `{ band, gap, leader }` the band where the halves differ most, `total` / `hostTotal` =
each half's whole count. `runs` = the stretches of one half's lead, youngest first:
`[{ leader, from, to, count, ties, widest: { band, gap } }]`.

The render refuses when one half leads every band (the fold would have no crossing to name) and
when the lead changes more than three times (the crossing would be one of many).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const bands = data.rows
  .filter((r) => r[col("year")] === 2023)
  .map((r) => ({ band: String(r[col("group")]), left: Number(r[col("count_a")]), right: Number(r[col("count_b")]) }));
```

Keep the bands in age order, youngest first.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`widest.band === "55-59"`), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`b`, `p`, `f`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs` (a browser failure that a typeface "really
  DRAWS, not its fallback" means the letters set in that face happen to measure like the fallback:
  reword the eyebrow or the label it names). If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
