# Gantt (web) — what you write

The page is already designed: it comes from the worked example `proof/web-gantt-top-ten-tenure` and
the story's PALETTE.md and DIRECTION.md. One row per entity on an axis of WHOLE YEARS from `first` to
`last`; one bar per run of consecutive years (a row in two pieces has a gap, and the gap is drawn); a
run still going at `last` ends in a taper; each row's tenure is printed at its tip. The rows the
takeaway is about are drawn in the accent, the others in a neutral. The colours, the type, the
layout and the INTERACTION are done: the ORIGIN is what the reader operates. A control ("align the
bars on") moves where every bar starts — the calendar (the default: position = date), each row's own
entry (every row from the same edge, the axis counting years since entry), or the held years alone
(gaps closed, so a bar is exactly its tenure). One year is the same length in every state, the rows
never move, and the axis words change in place. Every row answers hover, tap and Tab. With
JavaScript off the page is the complete static calendar plate. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
runs and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
row's tenure, window, gaps, rank and ties and the three alignments, draws the page, checks it in a
real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ key, label, runs }` per entity (2 to 30), in the order they are drawn top to bottom (by first year, then by tenure). `key` is the data's own name, `label` is printed. `runs` is `[{ from, to }]`: whole years, in order, with a gap of at least one year between two runs of the same row. A run reaching `last` is drawn open (still running) unless it says `open: false`. You may add other fields (a best rank): `detail()` receives them. |
| `subjects` | The `key`s of the rows the takeaway is about. Drawn in the accent. |
| `first` / `last` | The axis's first and last year (integers). Every run falls inside them. |
| `tickEvery` | Optional: the step between graduations in years (default: 5 for a 35-year axis, chosen to give about seven). |
| `tenureLabel(r)` | The tenure printed at a row's tip ("35 years"). |
| `detail(r)` | The tooltip sentence for one row, true in every state: its periods, its absences, its entry. Every row must answer differently (start with its label). |
| `alignLabel` | The control's legend ("Align the bars on"). |
| `calendar` / `entry` / `held` | The three origins' words, each `{ label, announce, note }` (each a string, or a function of the summary `s`): `label` is the pill; `announce` is what a screen reader hears and must CONTAIN `label`; `note` is the sentence shown under the control. `calendar` is the default. |
| `note` | `{ row, text }`: the ONE short note set on the plate, on the row whose `key` is `row` (e.g. the single-year row: "a single year, 1991"). |
| `subjectsNote` | The sentence under the plot naming the accented group ("The 6 countries in colour never left the top 10."). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a bar means, the window, how many rows, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: change the alignment; hover or tab a row. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the summary `s`). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

### What the word functions receive

A row reading `r` is the row as you gave it plus `{ label, index, runs, years, window, entry, exit,
gaps, rank, ties, entryOffset, open, whole, count, isSubject }`: `runs` = `[{ from, to, open }]`;
`years` = the years held (its tenure); `entry` / `exit` = its first / last year; `window` = `exit +
1 − entry` (longer than `years` when the row was interrupted); `gaps` = the missing years as
strings ("1991", "1999–2000"); `rank` = its place by tenure (1 = longest, ties share a rank); `ties`
= the labels of the other rows with the same tenure; `entryOffset` = `entry − first`; `open` = its
last run is still running; `whole` = it holds every year of the axis; `count` = the axis's number of
years; `index` = its row position from the top (0).

The summary `s` is `{ rows, count, extent, first, last, subjects, interrupted }`: `rows` = every row
reading; `count` = how many rows; `extent` = the axis's number of years; `subjects` = the subject
rows' readings; `interrupted` = the readings of rows with more than one run.

## Reading the data

Rows are arrays; find columns by name.

- If the data has a start and an end column per row, each data row is a run: group them by entity.
- If the data is a yearly table (one row per entity per year, or a ranking), collect each entity's
  years, then cut them into runs of consecutive years, as `beat.example.mjs` does:

```js
const runsOf = (years) => {
  const out = [];
  for (const y of [...years].sort((a, b) => a - b)) {
    const open = out.at(-1);
    if (open && open.to === y - 1) open.to = y; else out.push({ from: y, to: y });
  }
  return out;
};
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `s`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
