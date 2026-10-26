# Line (video) — what you write

The video is already designed: it comes from the worked example `proof/video-line-swiss-co2` and the
story's PALETTE.md and DIRECTION.md. The shots, their timing (20 s at 30 fps), the type, the colours
and the layout are done. The video opens on a title card (eyebrow + title); then three value ticks
(floor, the landing year's level, top) and the years along the bottom; the line traces the series
from its first year to its last, linear in years, its tip carrying « year · value unit », the peak
marked once passed; the last reading is ringed; a dashed level line shoots back from it, the year
counting down at its head, and lands where the rising line last passed through that reading before
the peak — that year ringed; then the credit on one line. There is no standfirst and no sentence on
screen. You do not change any of that.

The video argues ONE thing: the last reading is back under the level of an earlier year, found by
the rewind. `render-beat.mjs` (already in the folder) finds that year, lays the frames out, renders
twelve stills, prints `look at: <png>`, then renders the mp4 (about a minute and a half).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `data` | One `{ year, value }` per year, from `data.json`, every year from the first to the last (no gap), 8 to 160 years. |
| `unit` | The unit every value carries, short ("Mt", "%", "deaths"); `""` for none. |
| `peakLabel` | The label on the series' highest point ("peak of 1973"), its year COMPUTED from the data. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `decimals` | Optional: decimals on every value (0 to 3). Default: one from 1 and two under 1 while the largest value is under 100, none past it. |
| `evidenceLevels` | Optional, 3. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- the series skips a year (start it after the gap);
- the last reading is the series' highest, or the series before its peak never rises through the
  last reading (the rewind has no year to land on: start the data earlier, or use another format);
- the title names a year that is not the first, the peak's, the last or the landing year the data
  gives (the rewind would contradict it);
- the title or the credit does not fit the frame (shorten it).

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads the one series to draw, by column name — use it instead of writing filters:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const data = series(table, { x: "year", y: "amount", where: { region: "All regions" }, from: 1990 });
```

It throws, by name, on a missing column, a filter that keeps nothing, two values for one year, or a cell that is not a number. Hyphens and empty cells are skipped.
Large raw values may be rescaled (tonnes → million tonnes) when the unit says so.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says "less than in YEAR", `check()` tests that the last value is under that year's and that YEAR is the first year after the last pre-peak year at or under the last value.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole line, the last reading and its landing ringed). If the render refuses, read
  its message and fix `beat.mjs`. If the picture is wrong (a cut word, the wrong year), fix
  `beat.mjs` with a small `edit_file`, render and look again.
