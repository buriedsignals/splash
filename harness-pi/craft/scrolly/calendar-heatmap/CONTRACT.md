# Calendar heatmap (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-calendar-heatmap-geneva`
and the story's PALETTE.md and DIRECTION.md. One cell per day (twelve month rows of 31 day columns,
the impossible dates pale), six bins of roughly equal count on one ramp, colours, type, layout and
the CHOREOGRAPHY are done. The graphic stays fixed while six cards of prose travel up over it, and
the reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the empty calendar: one cell a day, one row a month | `cards.calendar` |
| 2 | the year fills day by day, 1 January to 31 December; the six-bin key arrives | `cards.bins` |
| 3 | every day under `threshold` steps back to a neutral | `cards.warm` |
| 4 | the months the longest run crosses open to fill the frame and print their values; the outline traces the run while a counter climbs to its length | `cards.run`, `counterSuffix` |
| 5 | the year returns in full colour; each month's mean is drawn beside its row, the highest in the accent | `cards.month`, `meansLabel` |
| 6 | the highest and the lowest day ringed and named | `cards.extremes`, `extremeLabel`, then `limits` |

The run, the bins, the monthly means and the extremes are computed. With JavaScript off the page
shows card 6's picture and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
days and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every card function and `counterSuffix`, `alt` receive `r`, computed by the render from your `days`:

| Field | What it is |
|---|---|
| `r.year`, `r.count` | the year, and how many days it has |
| `r.threshold` | your `threshold` |
| `r.run` | the longest run of consecutive days with `value >= threshold`: `{ length, from, to }`; `from` / `to` are days (below) |
| `r.warmDays` | how many days of the year have `value >= threshold` (card 3's coloured days) |
| `r.hottest`, `r.coldest` | the highest and the lowest day |
| `r.means` | the twelve monthly means, `[{ month (0–11), name, mean }]` |
| `r.warmest` | the month with the highest mean, `{ month, name, mean }` (card 5's accent) |
| `r.breaks`, `r.bins` | the key's five breaks, and the number of bins (6) |

A day is `{ date, month (0–11), day, monthName, value, label }`; `monthName` is from your `months`,
`label` is `formatValue(value)`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `days` | One `{ date: "YYYY-MM-DD", value }` per day, every day of ONE year (365 or 366), from `data.json`. |
| `threshold` | The value the run is counted from (`value >= threshold`); card 3 greys every day under it. |
| `months` | The twelve month names in the story's language, written down the side. |
| `unit` | The unit of a value ("°C", "mm"). |
| `format(v)` | How a break of the key is printed ("20"). |
| `formatValue(v)` | How a day's value, a monthly mean and an extreme are printed ("22,2"). |
| `breakDecimals` | Optional: decimals the bin breaks are rounded to (default 0). Raise it if the render says two bins share a break. |
| `cards` | `{ calendar(r), bins(r), warm(r), run(r), month(r), extremes(r) }` — the prose of cards 1 to 6, each a sentence (or an array of paragraphs). Card 1 must state `r.year`; card 3 `r.warmDays`; card 4 `r.run.length`; card 5 `formatValue(r.warmest.mean)`; card 6 `formatValue(r.hottest.value)` and `formatValue(r.coldest.value)`. |
| `counterSuffix(r)` | The words after card 4's counter ("days above 20 °C"). |
| `meansLabel` | The heading of card 5's column of monthly means ("mean"). |
| `extremeLabel(d)` | The name written by a ringed day (`d` is a day, above): start with its date, state `formatValue(d.value)`. |
| `keyLabel` | The caption of the colour key ("daily mean, in °C"). |
| `missingLabel` | The caption of the pale swatch for a date that does not exist. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Closes card 6, after the extremes: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the calendar (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: the days are not every day of one year; the
longest run is shorter than two days; every day at or above the threshold is in the run (cards 3
and 4 would show the same thing); the run crosses more than two months (card 4 opens two); a
monthly mean is below zero (card 5 draws means as bars from zero); two breaks print alike; a card
does not state its figure; or a card, a label or the alt states a number no figure of `r` rounds to.
A day of the month written before a month name ("18 July") is a date, not a figure.

## Reading the data

Rows are arrays in `columns` order. Find each column by name and keep ONE year:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [DATE, VALUE] = [col("day"), col("reading")];
const days = table.rows
  .filter((r) => String(r[DATE]).startsWith("2024-"))
  .map((r) => ({ date: String(r[DATE]), value: Number(r[VALUE]) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- The run's length and dates come from `r.run`, never counted by hand.

- Every number in a card, a label or the alt is taken from `r` (through `formatValue()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (the outline on the wrong days, a card cut, a wrong number), fix `beat.mjs`
  with a small `edit_file`, render and look again.
