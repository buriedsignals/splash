# Box plot (video) — what you write

The video is already designed: it comes from the worked example `proof/video-box-plot-france-co2-decades`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (19 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then the value
axis (the unit on the top tick) and the DECADES named under their slots; ONE yearly series appears
reading by reading, each at its year inside its decade; decade after decade the readings gather into
one column, the median is drawn through it, the box opens to the quartiles, the whiskers run to the
furthest years inside 1.5 × IQR and the years beyond them are ringed; each box lifts out beside its
readings; then one median walks the decades, sliding to each next box and climbing or dropping onto
its median — the decade with the HIGHEST median takes the accent and its median is printed, and the
last decade's median is printed; then the credit. There is no standfirst and no sentence on screen.
You do not change any of that.

The video argues ONE thing: which decade was the highest, and how the decades climb to it and fall
from it. The render buckets the years by decade, summarises each and finds the highest; you give
the series and the words.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `data` | One `{ year, value }` per year, from `data.json`: consecutive years, starting at a decade's first year (1950, 1960 …), 3 to 10 decades; the last decade may be partial with at least 4 years. |
| `unit` | The short unit on the top tick ("t", "%"); `""` for none. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `decimals` | Optional: decimals on the ticks and the two printed medians (0 to 3). Default: one under 100. |
| `evidenceLevels` | Optional, 3. |
| `check()` | Throws if the data no longer supports the title. |

The decades are named "1950s" … and the partial last one "2020–24".

The render refuses, saying what to change, when:
- the series skips a year, does not start at a decade's first year, or ends with a decade of fewer than 4 years;
- it spans fewer than 3 or more than 10 decades;
- the title names a year that is not the highest decade's start, the first or the last year;
- the decades' names, the medians or the credit do not fit the frame (fewer decades, shorter source forms).

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads the one series to draw, by column name — use it instead of writing filters:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const data = series(table, { x: "year", y: "amount", where: { region: "All regions" }, from: 1960 });
```

It throws, by name, on a missing column, a filter that keeps nothing, two values for one year, or a cell that is not a number. Hyphens and empty cells are skipped.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v * 10) / 10 === 10`), never with strict equality on the raw division.
- When the title says a decade peaked, `check()` computes each decade's median and throws unless that decade's is the highest.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: every box beside its readings, the highest decade in the accent). If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
