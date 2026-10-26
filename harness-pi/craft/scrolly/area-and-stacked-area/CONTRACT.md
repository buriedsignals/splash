# Area (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-world-population` and
the story's PALETTE.md and DIRECTION.md. The area, the scales, colours, type, layout and the
CHOREOGRAPHY are done. It draws ONE series — a STOCK that only grows (a population, a cumulative
total) — as a filled area from zero, and counts it whole unit by whole unit. The graphic stays fixed
while six cards of prose travel up over it, and the reader's scroll moves the picture continuously
from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the area fills from the first year to the year the series first reaches 1 | `cards.first`, `notes.first` |
| 2 | the area fills on to the year it reaches 2 | `cards.second`, `notes.second` |
| 3 | the area fills to the last year, every whole unit marked (a dashed level, a dot, its name) as it is reached; the last value written at the edge | `cards.all`, `notes.all` |
| 4 | the area gives way to one bar per unit: the years each unit took (the second's bar in grey) | `cards.gaps`, `notes.gaps` |
| 5 | the area's outline morphs into the annual growth rate (% a year), its peak marked | `cards.rate`, `notes.rate` |
| 6 | the area stands again, every unit marked | `limits`, `notes.reading` |

The scales are FIXED: the level runs from 0 to 9 units (ticks 0 to 8), the growth rate from 0 to
2.5 % a year. So express `data` in the unit whose whole numbers are the milestones (billions for a
world population: 0.98 … 8.09), with the series starting under 1 and staying under 9, crossing at
least 3 whole units. With JavaScript off the page shows card 6's picture and every card's words. You
do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
series and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `data`. A point is
`{ year, value }`; a crossing is `{ level, year, gap }` — `level` the whole unit reached (1, 2, …),
`year` the first year at or above it, `gap` the years since the previous crossing (`null` for the first).

| Field | What it is |
|---|---|
| `r.count` | how many years the series has |
| `r.first`, `r.last` | the first and the last year |
| `r.levels` | how many whole units the series crosses |
| `r.crossings` | every crossing, in order |
| `r.firstCrossing`, `r.second`, `r.third`, `r.latest` | the crossings of 1, 2, 3 and the last one |
| `r.longestGap`, `r.shortestGap` | the crossings whose unit took the most and the fewest years |
| `r.peakRate` | `{ year, value }`: the year the growth rate was highest, in % a year |
| `r.lastRate` | `{ year, value }`: the last year's growth rate, in % a year |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `data` | One `{ year, value }` per year, from `data.json` (one series), every year present, every value above zero, in the milestone unit (see above). Use `series()` (below). |
| `unit` | The unit line above the area ("world population, in billions"). |
| `gapUnit` | The unit line while card 4's bars are read ("years for each billion"). |
| `rateUnit` | The unit line while card 5's growth rate is read ("annual growth, in %"). |
| `format(v)` | How a level is printed (decimals, decimal comma or point for the language). |
| `formatRate(v)` | How a growth rate (% a year) is printed. |
| `cards` | `{ first(r), second(r), all(r), gaps(r), rate(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.first.value)` and `r.firstCrossing.year`; card 2 `r.second.year` and `r.second.gap`; card 3 `r.latest.year` and `format(r.last.value)`; card 4 `r.second.gap` and `r.latest.gap`; card 5 `formatRate(r.peakRate.value)` and `formatRate(r.lastRate.value)`. |
| `notes` | `{ first(r), second(r), all(r), gaps(r), rate(r), reading(r) }` — the short accent note in the header while each card is read ("1805: 1 billion"). |
| `labels` | `{ crossing(k), gapName(k), gapText(k), peak(r), last(r), rateLast(r) }`: `crossing(k)` names a crossing on the area and must state `k.year` ("1 bn · 1805"); `gapName(k)` names its bar on card 4 ("1 to 2 bn"); `gapText(k)` writes its years and must state `k.gap` ("122 years"); `peak(r)` writes the growth peak (must state `formatRate(r.peakRate.value)`); `last(r)` the last level (`format(r.last.value)`); `rateLast(r)` the last growth rate (`formatRate(r.lastRate.value)`). Keep them short. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the area measures and leaves out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the area (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title or a card's words (it receives `r`). |

The render refuses, saying what to change, when: a year is missing; a value is zero or less, or the
series falls from one year to the next (the growth view reads from 0 %); the series reaches 9 or more
units, starts at 1 or more, or crosses fewer than 3 whole units (change the unit); the growth rate
passes 2.5 % a year; a card or a label does not state its figure; or a card, a note, a label or the
alt states a number no figure of `r` rounds to.

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads the one series to draw, by column name — use it instead of writing filters:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const data = series(table, { x: "year", y: "residents", where: { region: "All regions" }, from: 1990 })
  .map((d) => ({ year: d.year, value: d.value / 1e6 })); // millions: the milestones are whole millions
```

It throws, by name, on a missing column, a filter that keeps nothing, two values for one year, or a cell that is not a number. Hyphens and empty cells are skipped.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, a label or the alt is taken from `r` (through `format()` / `formatRate()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a label over another, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
