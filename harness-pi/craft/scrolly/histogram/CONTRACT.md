# Histogram (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-carbon-footprint-spread`
and the story's PALETTE.md and DIRECTION.md. Every observation counts once; the bins are `binWidth`
wide from `binStart`, the last one open ("36+"); the bars are in a muted field and the one accent is
spent on the cut. Colours, type, layout and the CHOREOGRAPHY are done. The graphic stays fixed while
six cards of prose travel up over it, and the reader's scroll moves the picture continuously from
one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | every observation a dot at its own value on the axis; the furthest one named | `cards.dots`, `notes.dots` |
| 2 | the dots fall into their bins' columns, every count written: the histogram | `cards.bins`, `notes.bins` |
| 3 | the `threshold` drawn, the dots under it in the accent, the cut labelled | `cards.cut`, `notes.cut`, `cutLabel` |
| 4 | the median drawn and labelled | `cards.median`, `notes.median`, `medianLabel` |
| 5 | every observation at or above `tailFrom` named over its column | `cards.tail`, `notes.tail` |
| 6 | the columns give way to the bars, the cut kept | `limits`, `notes.reading` |

With JavaScript off the page shows card 6's picture and every card's words. You do not change any
of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
observations and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) counts
the bins, the observations under the cut, the median and the tail, checks your words against them,
draws the page, checks it in a real browser and prints `look at: <png>` (card 1), with one PNG per
card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `observations`:

| Field | What it is |
|---|---|
| `r.count` | how many observations |
| `r.bins` | `[{ index, lo, hi, open, count, label }]`, one per bin (`hi` is `null` for the open last bin) |
| `r.under`, `r.over` | how many observations are below `threshold`, how many at or above it |
| `r.underShare` | `r.under` as a percent of `r.count` |
| `r.median` | the median value |
| `r.furthest`, `r.lowest` | the observation with the largest value, the smallest, `{ name, value }` |
| `r.tail` | the observations at or above `tailFrom`, largest first, `[{ name, value }]` |
| `r.tailFrom`, `r.threshold`, `r.binStart`, `r.binWidth`, `r.binCount` | your settings |
| `r.top` | the last bin's lower edge plus one width (the axis's end) |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `observations` | One `{ name, value }` per reading (one per country, per town…), from `data.json`. At least 20. Leave out aggregate rows (a world or regional total is not one more reading). `name` is printed only for the tail (card 5) and the furthest (card 1). |
| `binStart` | Optional: the first bin's lower edge, at or under the smallest value (default `0`). |
| `binWidth` | The width of every bin, a round number (1, 2, 4, 5, 10…). |
| `binCount` | How many bins, 4 to 20. The LAST bin is open: it holds everything at or above its lower edge. It must hold a few outliers, not a quarter of the data. |
| `threshold` | The cut the takeaway counts against (e.g. `4` in "6 in 10 emit less than 4 tonnes"), inside the bins. |
| `tailFrom` | The value from which card 5 names every observation (1 to 12 of them). |
| `unit` | The variable and its unit, printed above the plot ("tonnes of CO₂ per person, 2023"). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `formatEdge(v)` | Optional: how a bin edge, the bin width and `tailFrom` are printed (default: the bare number). |
| `cards` | `{ dots(r), bins(r), cut(r), median(r), tail(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.count` and name `r.furthest` with `format(r.furthest.value)`; card 2 `r.binWidth`; card 3 `r.under` and `r.count`; card 4 `format(r.median)`; card 5 `r.tail.length` and `r.tailFrom`. |
| `notes` | `{ dots(r), bins(r), cut(r), median(r), tail(r), reading(r) }` — the short accent note in the header while each card is read. |
| `cutLabel(r)` | The words beside the cut ("127 countries under 4 t"); must state `r.under`. |
| `medianLabel(r)` | The words beside the median ("median 3.1 t"); must state `format(r.median)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what one reading is, the year, that each counts for one, how the bars count, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: there are fewer than 20 observations; an
observation is below `binStart`; the threshold is outside the bins; the open last bin holds more than
a quarter of the data; fewer than two bins hold anything; two bin names print the same; no
observation, or more than 12, reach `tailFrom`; a card or a label does not state its figure; or a
card, a note, a label or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE] = [col("place"), col("amount")];
const observations = data.rows
  .filter((r) => r[VALUE] !== null && Number.isFinite(Number(r[VALUE])))
  .map((r) => ({ name: r[NAME], value: Number(r[VALUE]) }));
```

Leave out aggregate rows (a "World" or "Total" row is not one more reading).

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
  If a picture is wrong (a card cut, a wrong number, a tail name piled on another), fix `beat.mjs`
  with a small `edit_file`, render and look again.
