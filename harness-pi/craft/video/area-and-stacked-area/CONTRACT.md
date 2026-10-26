# Area (video) — what you write

The video is already designed: it comes from the worked example `proof/video-area-swiss-co2` and the
story's PALETTE.md and DIRECTION.md. The shots, their timing (20 s at 30 fps), the type, the colours
and the layout are done. The video opens on a title card (eyebrow + title); then the value ticks and
the years; ONE series fills as an area from zero, year by year, while the running stock counts up in
the upper left; the surface steps back to its tint and a rule sweeps back from the last year,
repainting the recent surface while the stock's gauge fills with the share it has passed — it stops
at the year the running total reaches HALF the stock; each half levels to its mean height (the same
surface, as a block) and is named with its years and its length; the curve comes back whole, and the
credit. There is no standfirst and no sentence on screen. You do not change any of that.

The video argues ONE thing: half of everything accumulated came after one year, in far fewer years.
`render-beat.mjs` (already in the folder) finds that year, lays the frames out, renders twelve
stills, prints `look at: <png>`, then renders the mp4 (about a minute and a half).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `data` | One `{ year, value }` per year, from `data.json`, consecutive years (no gap), no value below zero, 8 to 250 years. |
| `valueUnit` | The short unit on the top tick and in the stock ("Mt", "GWh"); `""` for none. |
| `stock` | A function `(n) => words` for the running stock, `n` being the stock already printed in the story's number format (`(n) => \`${n} Mt since 1858\``) — or two such functions, longest first (the second drops what the axis already says: `(n) => \`${n} Mt\``). |
| `years` | A function `(n) => words` naming a half's length, `n` being its number of years (`(n) => \`${n} years\``). |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `decimals` | Optional: decimals on the ticks and the stock (0 to 3). |
| `evidenceLevels` | Optional, 4. |
| `check()` | Throws if the data no longer supports the title. |

The year the rule stops at is NOT a field: the render computes it (the first year the running total
reaches half the stock). Your `check()` computes it too, to test the title.

The render refuses, saying what to change, when:
- the series skips a year, or holds a value below zero;
- the running total reaches half only in the last year (no later half to sweep);
- the title names a year that is not the first, the last, the half year or the year after it;
- `stock` or `years` does not return words;
- a name, the stock or the credit does not fit the frame (shorten the words, add a shorter `stock` form).

## Reading the data

`series.mjs` (in the folder, from craft/_shared) reads the one series to draw, by column name — use it instead of writing filters:

```js
import { readTable, series } from "./series.mjs";
const table = readTable(import.meta.dirname);
const data = series(table, { x: "year", y: "amount", where: { region: "All regions" } });
```

It throws, by name, on a missing column, a filter that keeps nothing, two values for one year, or a cell that is not a number. Hyphens and empty cells are skipped.
Large raw values may be rescaled (tonnes → million tonnes) when the unit says so.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says "half since YEAR" or "half after YEAR", `check()` runs the running total and throws unless it first reaches half the total in that year.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole curve, the two halves named, the gauge at half). If the render refuses, read
  its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`,
  render and look again.
