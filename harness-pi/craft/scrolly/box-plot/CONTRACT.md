# Box plot (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-boxplot-france-co2-decades` and the story's PALETTE.md and DIRECTION.md. The points,
the boxes, the fitted scale, colours, type, layout and the CHOREOGRAPHY are done. It draws ONE yearly
series and groups its YEARS into DECADES, one box per decade, whiskers at 1.5 × the interquartile
range. The graphic stays fixed while six cards of prose travel up over it, and the reader's scroll
moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | every year a point in time; the highest year named | `cards.years`, `notes.years`, `labels.peak` |
| 2 | the points travel into one column per decade | `cards.decades`, `notes.decades` |
| 3 | each column closes into its box (quartiles, median, whiskers); the points step back, an outlier stays a point and is named | `cards.boxes`, `notes.boxes`, `labels.outlier` |
| 4 | the medians joined and written | `cards.medians`, `notes.medians`, `labels.median` |
| 5 | the widest decade and the last one kept, their extents written, the rest stepping back | `cards.spread`, `notes.spread`, `labels.spread` |
| 6 | the static plate, the whisker rule written on it | `limits`, `notes.reading`, `labels.rule` |

Under every column: its decade (`labels.decade`) and how many years it holds (`labels.count`). With
JavaScript off the page shows card 6's picture and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
series and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `data`. A point is
`{ year, value }`; a decade's box `b` is `{ decade, n, q1, median, q3, lo, hi, min, max }` — `n` its
years, `lo`/`hi` the whiskers' ends, `min`/`max` its lowest and highest year.

| Field | What it is |
|---|---|
| `r.count` | how many years the series has |
| `r.first`, `r.last` | the first and the last year |
| `r.decades` | how many decades (boxes) |
| `r.boxes` | every box, in order |
| `r.firstBox`, `r.lastBox` | the first and the last decade |
| `r.peakBox`, `r.lowBox` | the decades with the highest and the lowest median |
| `r.widest` | the decade with the widest extent (max − min) |
| `r.peakYear` | the highest year of the series |
| `r.outlier` | `{ year, value, decade }`: the one year outside its decade's whiskers, or `null` |
| `r.outlierCount` | 0 or 1 |
| `r.fence` | 1.5 (the whisker rule) |
| `r.drop` | percent the median fell from `r.peakBox` to `r.lastBox` |
| `r.lowerEveryDecadeAfterPeak` | true if every median after the peak decade is lower than the one before |
| `r.partial` | the boxes holding fewer than 10 years |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `data` | One `{ year, value }` per year, from `data.json` (one series), every year present, spanning 4 to 12 decades, at least 4 years in each. Use `series()` (below). |
| `unit` | The unit line above the plot ("tonnes of CO₂ per person"). |
| `format(v, decimals)` | How a value is printed, `decimals` 1 by default; the render asks for 2 for a median. |
| `cards` | `{ years(r), decades(r), boxes(r), medians(r), spread(r) }` — the prose of cards 1 to 5. Card 1 must state `format(r.peakYear.value)` and `r.peakYear.year`; card 3, when there is an outlier, `r.outlier.year` and `format(r.outlier.value)`; card 4 `format(r.firstBox.median, 2)`, `format(r.peakBox.median, 2)` and `format(r.lastBox.median, 2)`; card 5 `format(r.widest.min)`, `format(r.widest.max)` and `r.lastBox.n`. |
| `notes` | `{ years(r), decades(r), boxes(r), medians(r), spread(r), reading(r) }` — the short accent note in the header while each card is read. |
| `labels` | `{ decade(b), median(b), count(b), spread(b), peak(r), outlier(r), rule(r) }`: `decade(b)` names a column ("1950"); `median(b)` must state `format(b.median, 2)`; `count(b)` must state `b.n` ("10 years"); `spread(b)` must state `format(b.min)` and `format(b.max)`; `peak(r)` must state `format(r.peakYear.value)`; `outlier(r)` must state `format(r.outlier.value)` (called only when there is one); `rule(r)` writes the whisker rule ("whiskers: 1.5 × the interquartile range"). Keep them short. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what a box is, the whisker rule, the limits the journalist named (a partial decade says how many years it holds). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the boxes (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title or a card's words (it receives `r`). |

The render refuses, saying what to change, when: a year is missing; the series spans fewer than 4 or
more than 12 decades, or a decade holds fewer than 4 years; the 1.5 × IQR fence leaves more than one
year outside its box (this choreography names one outlier); a card or a label does not state its
figure; or a card, a note, a label or the alt states a number no figure of `r` rounds to.

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads the one series to draw, by column name — use it instead of writing filters:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const data = series(table, { x: "year", y: "rate_per_1000", where: { region: "All regions" }, from: 1960 });
```

It throws, by name, on a missing column, a filter that keeps nothing, two values for one year, or a cell that is not a number. Hyphens and empty cells are skipped.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, a label or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a label over another, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
