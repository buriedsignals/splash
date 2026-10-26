# Bullet (web) — what you write

The page is already designed: it comes from the worked example `proof/web-bullet-low-carbon-share`
and the story's PALETTE.md and DIRECTION.md. One horizontal track per row from 0 to 100 %, the
measure bar on it, a target tick, the gap to that target (solid past it, hollow short of it), a
verdict chip per row, the threshold rule, the colours, the type and the INTERACTION are done — a
"measure against" control changes the target of every row at once: each row's own earlier value
(the plate), the threshold the takeaway names, the median of the rows, or the leader; the ticks
travel and every gap and verdict re-derives. Every row answers hover, tap and Tab with its detail.
With JavaScript off the page is the complete static plate, judged against each row's own earlier
value. You do not change any of that.

This page judges a SHARE IN PERCENT (0 to 100), then and now, for 3 to 12 rows. Rows are drawn in
order of their change, the largest first.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
target, gap and verdict, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, before, after }` per row, from `data.json`: the share (0–100) at the earlier and the later date. One row per name. |
| `subject` | The `name` of the row the takeaway is about. It is drawn in the accent. |
| `format(v)` | How a share is printed, WITH its unit ("31.1 %"). |
| `detail(r)` | The tooltip sentence for one row; the page prints the name before it. `r` is `{ name, before, after, change }` (`change` = after − before, in points). |
| `verdict(v)` | The chip printed on a row under one target. Must contain `format(v.after)`. `v` is `{ name, after, before, change, target, gap, verdict, key }`: `gap` = after − target (points), `verdict` is `"over"`, `"level"` or `"short"`, `key` is which target (`"own"`, `"threshold"`, `"median"`, `"leader"`). |
| `threshold` | The line the takeaway names (e.g. 50), a multiple of 5. |
| `thresholdLabel` | That target's option label — words the TITLE itself contains ("half"). The render refuses words the title does not contain. |
| `thresholdNote` | The rule's name printed on the plot ("half"). |
| `benchmarkLabel` | The control's legend ("Measure each country against"). |
| `ownLabel` | The landing target's label: each row's own earlier value ("its own 2015"). |
| `ownAnnounce` | What a screen reader hears for it. Must contain `ownLabel`. |
| `medianLabel` | The median target's label ("the median of the six"). |
| `leaderLabel(l)` | The leader target's label; `l` is `{ name, value }` of the highest row ("Sweden"). |
| `announce(t)` | What a screen reader hears for the threshold, median and leader options. Must contain `t.label`. |
| `note(t)` | The sentence shown when that target is chosen. Must state `t.clears`. `t` is `{ key, label, value, count, clears, short, verdicts, nearestOver, nearestShort, median, leader, subject }`: `value` = the target; `clears` / `short` = how many rows reach it / fall short; `verdicts` = every row's `{ name, after, before, change, gap, verdict }` in drawn order (largest change first); `nearestOver` / `nearestShort` = the row just over / just under it (or null); `subject` = the subject row's verdict. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what the share is, the dates, the limits the journalist named. |
| `reading` | One or two sentences: change the target; hover, tap or tab a row. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the tracks. |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses when the four targets leave fewer than three different counts of rows that clear
them: four targets that give the same verdicts are not four questions.

## Reading the data

Rows are arrays in `columns` order; find columns by name. Example with neutral names, a share
computed from parts:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const shareOf = (place, year) => {
  const r = table.rows.find((r) => r[col("place")] === place && Number(r[col("year")]) === year);
  return (Number(r[col("part")]) / Number(r[col("total")])) * 100;
};
const rows = ["A", "B", "C"].map((name) => ({ name, before: shareOf(name, 2015), after: shareOf(name, 2024) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `v`, `t`, `l`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
