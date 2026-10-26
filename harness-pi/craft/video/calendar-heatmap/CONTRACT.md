# Calendar heatmap (video) — what you write

The video is already designed: it comes from the worked example `proof/video-calendar-heatmap-geneva`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (21 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then ONE YEAR is
drawn as its daily values over a dashed threshold line, linear in days, the days at or over it in
the accent and counted ("59 days above 20 °C"); every day falls from the curve into its calendar
cell (a row a month, a column a day of the month), one after another, taking its bin's colour (six
quantile bins), the months, day ticks and key coming in; the days under the threshold step back
while an outline runs along the LONGEST RUN of days at or above it, a day at a time, its length
counting ("31 days in a row"); the colours come back, the run still outlined, and the credit. There
is no standfirst and no sentence on screen. You do not change any of that.

The video argues ONE thing: the longest run of days at or above a threshold. The render finds it,
counts the warm days and bins the year; you give the data and the words.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `days` | One `{ date: "YYYY-MM-DD", value }` per day, every day of ONE year (365 or 366), from `data.json`. |
| `threshold` | The value the run is counted from: the longest run of days with `value >= threshold`. |
| `months` | The twelve month names in the story's language. |
| `unit` | The unit of a value ("°C", "mm"), printed after the threshold and the last break of the key. |
| `warm` | A function `(n) => words` for the count of days at or above the threshold (`(n) => \`${n} days above 20 °C\``). |
| `run` | A function `(n) => words` for the run's count (`(n) => \`${n} days in a row\``). |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `breakDecimals` | Optional: decimals the bin breaks are rounded to (default 0). Raise it if the render says two bins share a break. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- a date is not "YYYY-MM-DD", the days span more than one year, a day is missing or given twice;
- no two days in a row reach `threshold`;
- two bins share a break (raise `breakDecimals`);
- the title names a year that is not the calendar's;
- `warm` or `run` does not return words; the counts, the months or the credit do not fit the frame.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [DATE, VALUE] = [col("day"), col("reading")];
const days = data.rows.filter((r) => String(r[DATE]).startsWith("2023-")).map((r) => ({ date: r[DATE], value: Number(r[VALUE]) }));
```

## Rules

- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about (a daily mean, a daily maximum…): read the column the takeaway names.
- When the title says "N days in a row at or above X", `check()` counts the longest run of days with `value >= X` and throws unless it is N.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole calendar in colour, the run outlined). If the render refuses, read its
  message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`,
  render and look again.
