# Area (web) — what you write

The page is already designed: it comes from the worked example `proof/web-area-swiss-co2` and the
story's PALETTE.md and DIRECTION.md. The filled surface from zero, the cut into two chromas of one
hue, the cut rule and its note, the end label, the axes, the colours, the type and the INTERACTION
are done — every year answers hover, tap and Tab with its value and the share of the whole total
already behind it, and a "cut at" control hands the cut to the reader: they choose a year, the seam
moves there, a rule stands on it and one sentence gives the years and the share of the total on each
side. With JavaScript off the page is the complete static plate. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
series and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
reading, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

This page draws ONE series as a filled area from zero. The area is the STOCK (the total
accumulated), the height is one year's flow.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `data` | One `{ year, value }` per year, from `data.json`: consecutive years, no value below zero. |
| `cut` | The year the plate cuts the surface at, COMPUTED (e.g. the year the running total passes half) or the year the takeaway names. Strictly between the first and last year. |
| `valueUnit` | The short unit printed after values ("Mt CO₂", "GWh"). |
| `format(v, decimals)` | How a value is printed, in the story's language (`decimals` defaults to 1). |
| `cutNote` | The note on the cut rule ("1986: half the total is behind"). Must contain the cut year. Keep it under ~40 characters. |
| `detail(r)` | The tooltip sentence for one year. `r` is `{ year, value, sharePct, isCut, isLast, firstYear, lastYear, total }`: `sharePct` = percent of the whole total emitted from the first year up to and including this one. Every year must answer differently (start with the year). |
| `markLabel(r)` | Optional: the year's accessible name, same `r`. Default: `detail(r)`. |
| `cutYears` | 2 to 8 years the reader may cut the surface at (e.g. birth years spanning a readership), each at least 2 years inside the series. |
| `levelLabel` | The control's legend ("Since I was born in"). |
| `noneLabel` | The untouched option's words — the plate's own cut ("Half, in 1986"). |
| `announce(c)` | What a screen reader hears for one year of `cutYears`. Must contain `c.year`. |
| `note(c)` | The sentence shown under the control when that year is chosen. Must state `format(c.shareOfTotal, 1)`. `c` is `{ year, yearsFrom, yearsBefore, count, firstYear, lastYear, shareOfYears, shareOfTotal, sumFrom, sumBefore, meanFrom, meanBefore }`: `yearsFrom` = years from `year` to the last, inclusive; `yearsBefore` = years before it; `count` = all years; `shareOfYears` = `yearsFrom` as a percent of `count`; `shareOfTotal` = percent of the whole total from `year` on; `sumFrom` / `sumBefore` = the totals on each side; `meanFrom` / `meanBefore` = the yearly mean on each side. |
| `total(t)` | The line printed under the source. Must contain the cut year. `t` is `{ firstYear, lastYear, count, total, cut, shareFromCut, yearsFromCut, yearsBeforeCut }`: `shareFromCut` = percent of the total from the cut year on (inclusive). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what the area measures, the unit, the scope, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: choose a year in the control; hover, tap or tab any year. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the surface. |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |
| `yTicks`, `xTicks` | Optional. Leave them out; they are derived (the value axis always starts at zero). |

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads the one series to draw, by column name — use it instead of writing filters:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const data = series(table, { x: "year", y: "emissions_mt", where: { region: "All regions" }, from: 1990 });
```

It throws, by name, on a missing column, a filter that keeps nothing, two values for one year, or a cell that is not a number. Hyphens and empty cells are skipped.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `c`, `t`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- A series with a missing year, or a value below zero, is refused: an area cannot be drawn over it.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
