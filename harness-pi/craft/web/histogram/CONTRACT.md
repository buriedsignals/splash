# Histogram (web) — what you write

The page is already designed: it comes from the worked example `proof/web-histogram-carbon-footprint`
and the story's PALETTE.md and DIRECTION.md. The touching bins from zero, the accent on the bins the
takeaway counts, the median's rule and name, the claim's name, the axes, the colours, the type and the
INTERACTION are done — a "measure against" control lets the reader choose a coverage band (a
quantile of the observations, which no bin width can move): a dashed rule stands at it with its value
at its foot, every bin entirely beyond it is hollowed, and a sentence says how many observations sit
under it, its multiple of the median and how much of the width the rest occupy; every bin answers
hover, tap and Tab with its interval, count, share, cumulative share and who is in it. With
JavaScript off the page is the complete static plate, and the control still works. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
observations and the WORDS of this story's page. `render-beat.mjs` (already in the folder) bins
them, counts, computes every reading, draws the page, checks it in a real browser and prints
`look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

The bins start at 0 and are all `binWidth` wide; the last one holds the largest observation. The
bins that end at or under `threshold` are drawn in the accent — the takeaway's count. The render
refuses fewer than 3 or more than 50 bins, a threshold that is not a bin edge, and a width so narrow
that the body of the distribution breaks into a comb.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `observations` | One `{ name, value }` per reading (one per country, per town…), from `data.json`. At least 20, none negative, each name once. Leave out aggregate rows (a world or regional total is not one more reading). |
| `binWidth` | The width of every bin, a round number (1, 2, 5, 10…) that divides `threshold`. |
| `threshold` | The cut the takeaway counts against (e.g. `4` in "127 of 213 emit less than 4 tonnes"): a bin edge. |
| `unit` | The variable and its unit ("t CO₂ per person"). |
| `format(v)` | How a value of the variable is printed, with its short unit ("5.8 t"): at a rule's foot and in the sentences. |
| `detail(b)` | The tooltip sentence for one bin. `b` is `{ from, to, isLast, count, total, sharePct, cumulativePct, names, others }`: `to` is null for the last bin (say "and above"); `sharePct` = percent of all observations in it; `cumulativePct` = percent at or under its upper edge; `names` = up to four of its observations, largest first; `others` = how many more. Start with the interval: every bin must answer differently. |
| `claimNote(s)` | The claim's name, printed at the threshold ("59.6 % of countries under 4 t"). `s` is `{ count, total, share, median, threshold }`: `count` of `total` observations are under `threshold`, `share` = count / total (a fraction). |
| `medianNote(s)` | The median's name on its rule. Must state `format(s.median)`. |
| `bands` | The coverage bands the reader can choose, at least two `{ p, label }` with `p` strictly rising between 0 and 1 (`{ p: 0.75, label: "3 in 4" }`). Each must fall in its own bin, above the bins the takeaway counts. You may add fields (e.g. `words: "Three quarters"`) — `announce`/`note` receive them back. |
| `levelLabel` | The control's legend ("Measure against"). |
| `noneLabel` | The untouched option's words ("The distribution alone"). |
| `announce(b)` | What a screen reader hears for one band. Must contain `b.label`. `b` is your band plus `{ value, below, above, total, median, ratio, widthBeyond, bin }`: `value` = the quantile, `below` / `above` = observations under / at or over it, `ratio` = value ÷ median, `widthBeyond` = percent of the axis width beyond it, `bin` = `{ from, to, isLast }` the bin it falls in. |
| `note(b)` | The sentence shown when that band is chosen. Must state `format(b.value)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what one reading is, the year, that each counts for one, the bin width, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: hover, tap or tab a bin; choose a coverage band. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `{ count, total, share, median, threshold, bins, bands }` — `bands` with their computed fields). |
| `xTicks` / `yTicks` | Optional: the axis ticks. Default: computed. |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(s)` | Throws if the data no longer supports the title. The render passes `{ count, total, share, median, threshold, bins }` (`bins` = the count in each bin). |

## Reading the data

Each row of `data.json` is an array; find columns by name, never by position. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, PERIOD, VALUE] = [col("place"), col("period"), col("value")];
const observations = data.rows
  .filter((r) => r[PERIOD] === 2023)
  .map((r) => ({ name: r[NAME], value: Number(r[VALUE]) }));
```

If the table holds several years or groups, filter to the ONE the takeaway is about first, so each
place appears once.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(share * 10) === 6`, or a count as a count), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`b`, `s`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- Keep `claimNote` and `medianNote` short (under ~30 characters): they sit on the plot, and the
  browser check refuses a label printed over another word.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (the accent on the
  wrong bins, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and
  look again.
