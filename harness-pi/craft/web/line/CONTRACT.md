# Line (web) — what you write

The page is already designed: it comes from the worked example `proof/web-line-swiss-co2` and the
story's PALETTE.md and DIRECTION.md. The curve, the reference rule, the peak ring, the end label,
the fitted axes, the colours, the type and the INTERACTION are done — there is no control; every
year of the series answers hover, tap and Tab with readings the plate cannot print for all of them.
With JavaScript off the page is the complete static plate. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
series and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
year's reading, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `data` | One `{ year, value }` per year, from `data.json` (one series). |
| `unit` | The unit printed in the end label ("deaths", "Mt", "%"). |
| `format(v)` | How a value is printed, in the story's language. |
| `referenceYear` | The year whose value the horizontal rule is drawn at — the level the reader compares the curve to, FOUND from the data. |
| `referenceLabel` | The rule's name, printed on it ("2015 level: 32.5"); its numbers computed. |
| `peakLabel` | The label beside the series' highest point; its numbers computed. |
| `detail(r)` | The tooltip sentence for one year. `r` is `{ year, value, isPeak, isLast, peakYear, peakValue, belowPeakPct, backTo, yearsBack, lastYear, lastValue, vsLastPct, lastTimes }`: `belowPeakPct` = percent under the peak; `backTo` = after the peak, the earliest year before the peak whose level this year has fallen back to (null if none), `yearsBack` = `year - backTo`; `vsLastPct` = percent change from this year to the last reading, `lastTimes` = last ÷ this year. Every year must answer differently (start with the year). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: unit, scope, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: hover, tap or tab any year. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the curve. |
| `evidenceLevels` | Optional, 3 or 4. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

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

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- Keep `referenceLabel` and `peakLabel` short (under ~30 characters): they sit on the plot, and the
  browser check refuses a label printed over another word.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
