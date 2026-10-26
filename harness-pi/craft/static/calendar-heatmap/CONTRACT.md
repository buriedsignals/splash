# Calendar heatmap — what you write

The month-by-day grid (twelve rows, 31 columns), the six binned colours and their printed breaks,
the outline around the longest run, the pale cells for dates that do not exist, the type, the
colours and the layout are already done: they come from the worked example
`proof/static-calendar-heatmap-geneva` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
plate says. `render-beat.mjs` (already in the folder) draws it.

A calendar heatmap draws ONE value for every day of ONE complete year, one cell per day, coloured
in six bins of roughly equal count. The render outlines the longest run of consecutive days AT OR
ABOVE your `threshold`. You give the readings; the run, the bins and the monthly means are computed
by `calendar.mjs`, for the drawing and for your sentences.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `days` | One `{ date: "YYYY-MM-DD", value }` per day, every day of one year (365 or 366), from `data.json`. |
| `threshold` | The value the outlined run is counted from: the longest run of days with `value >= threshold`. |
| `months` | The twelve month names in the story's language. |
| `monthsShort` | The same twelve, abbreviated, all different ("Jun", "Jul" — never two alike). |
| `unit` | The unit of a value ("°C", "mm"). |
| `keyLabel` | The caption of the colour key ("daily mean, in °C"). |
| `missingLabel` | The caption of the pale swatch for a date that does not exist ("date that does not exist"). |
| `format(v)` | How a break in the key is printed. |
| `breakDecimals` | Optional: decimals the bin breaks are rounded to (default 0). Raise it if the render says two bins share a break. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: what a cell is, the year, the place, where the run starts and ends, the limits the journalist named. |
| `reading` | The reading line in forms, longest first ("Reading: one row per month, one column per day of the month."). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the calendar. |
| `evidenceLevels` | How many levels of evidence the plate ranks (2 in the worked example). |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows are arrays in `columns` order. Keep the rows of the one year and the one series drawn, then use
`calendar.mjs` for every number in a sentence:

```js
import { toDays, longestRun, monthlyMeans } from "./calendar.mjs";
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [DATE, VALUE] = [col("date"), col("value")];
const readings = table.rows.map((r) => ({ date: String(r[DATE]), value: Number(r[VALUE]) }));
const { year, days } = toDays(readings);       // days: [{ date, month (0-11), day, value }]
const run = longestRun(days, 20);             // { length, from, to } — from/to are days
const means = monthlyMeans(days);              // [{ month, mean }]
```

`toDays` throws, by name, on several years, a day given twice, or a missing day.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- The run's length and dates come from `longestRun`, never counted by hand.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- `toLocaleString("fr-FR")` (and some other locales) prints narrow no-break spaces no typeface covers: replace `   ` with a plain space.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (the outline on the wrong
  days, month names printed over each other, wrong number), fix `beat.mjs` with a small `edit_file`,
  render and look again.
