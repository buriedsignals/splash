# Calendar heatmap (web) — what you write

The page is already designed: it comes from the worked example `proof/web-calendar-heatmap-geneva`
and the story's PALETTE.md and DIRECTION.md. One cell per day (twelve month rows of 31 day columns,
the impossible dates dashed), binned on one ramp with a key in the data's units, the longest run at
or above the claim's threshold outlined, the colours, the type and the INTERACTION are done — a
"threshold" control moves the line: the outline is retraced around the longest run at the chosen
threshold, and one sentence gives its length, its two dates and how many days clear the line; every
day answers hover, tap and Tab with its value, its bin and its rank in the year. With JavaScript off
the page is the complete static plate. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
days and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes the runs,
the bins and the ranks, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `days` | One `{ date: "YYYY-MM-DD", value }` per day, every day of one year (365 or 366), from `data.json`. |
| `threshold` | The claim's threshold: the outlined run is the longest run of days with `value >= threshold`. |
| `thresholds` | 2 to 6 other thresholds the reader can move the line to (each must select a different run). |
| `breaks` | Optional: the 2 to 6 bin breaks of the colour key, rising, inside the values' range. Left out, round breaks are derived. |
| `months` | The twelve month names in the story's language. |
| `monthsShort` | The same twelve, abbreviated, all different ("Jun", "Jul" — never two alike). Printed down the side. |
| `unit` | The unit of a value ("°C", "mm"). |
| `format(v)` | How a break and a threshold are printed ("20"). The key and the control print `format(v)` + `unit`. |
| `detail(d)` | The tooltip for one day. `d` is `{ date, month, day, monthName, value, rank, count, binLabel }`: `rank` = its place from the highest value of the year (ties share a rank), `count` = days in the year, `binLabel` = its bin as the key prints it. Start with the date. |
| `streakNote(r)` | The note under the calendar naming the outlined run. Must state `r.length`. |
| `cutoffLabel` | The control's legend ("The run's threshold:"). |
| `claimAnnounce(r)` | What a screen reader hears for the claim's threshold. Must contain its label (`format(threshold)` + " " + `unit`). |
| `announce(r)` | The same for each other threshold. Must contain its label. |
| `note(r)` | The sentence shown when another threshold is chosen. Must state `r.length`. Every `r` above is `{ threshold, length, days, from, to, count }`: `length` = the longest run's days, `days` = how many days of the year clear the threshold at all, `from` / `to` = the run's first and last day as `{ date, month, day, monthName }`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a cell is, the year, the place, the bins, the limits the journalist named. |
| `reading` | The reading line: a string, or a function of `{ claim, lines, anchor }` — `claim` and each of `lines` are an `r` as above; `anchor` is `{ low, high, lines, end, startLow, startHigh }`: from threshold `low` to `high` the longest run always ends on `end` while its start moves from `startLow` to `startHigh` (`low === high` when only the claim's threshold ends there). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the calendar. |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows are arrays in `columns` order. Find each column by name and keep ONE year:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [DATE, VALUE] = [col("day"), col("reading")];
const days = table.rows
  .filter((r) => String(r[DATE]).startsWith("2024-"))
  .map((r) => ({ date: r[DATE], value: Number(r[VALUE]) }));
```

For `check()`, the longest run at or above a threshold, walking the days in date order:

```js
let longest = 0, run = 0;
for (const d of days) { run = d.value >= threshold ? run + 1 : 0; longest = Math.max(longest, run); }
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`d`, `r`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
