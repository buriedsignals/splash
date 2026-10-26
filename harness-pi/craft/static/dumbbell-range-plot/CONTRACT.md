# Dumbbell (range plot) — what you write

The two dots per row, the bar between them, the gain printed at the right, the key, the type, the
colours and the layout are already done: they come from the worked example
`proof/more-dumbbell-life-expectancy-gains` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What the plate is

One row per entity, two states of ONE measure on a shared axis: a pale dot at the first state, a full
dot at the second, the bar between them is the change, and the change (`to - from`) is printed at the
right of every row. The render computes the change itself and RANKS the rows by it, largest first.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ key, label, from, to }` per entity. `key` is the data's own name, `label` is printed, `from` and `to` are the values at the two states. Do not sort; do not compute the gain — the render does both. |
| `subject` | The `key` of the row the takeaway is about. It is drawn in the accent. |
| `keep` | Optional: the `key`s of other rows the headline names (e.g. the smallest gain). At a small frame the layout may drop rows; the subject and these are never dropped. |
| `scope(drawn, all)` | Optional: the sentence that heads the standfirst when the layout draws fewer rows than the data holds ("6 of the 10 countries: …"). Leave it out and no row is ever dropped. |
| `fromName` / `toName` | The two states as strings (`"2000"`, `"2023"`), printed in the key above the rows. |
| `unit` | The unit printed on the axis ("years", "%"). |
| `format(v)` | How an axis tick is printed. |
| `gainLabel(row)` | How a row's change is printed at the right, from `row.gain` — signed (`+5,0`, `−1,2`), in the story's language. |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: the measure, the two states, the scope, the limits the journalist named. |
| `reading` | The reading line, in forms, longest first: which dot is which state, the bar is the change. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the rows, the largest and the smallest change. |
| `scopeAltLead` | Optional: the words that join `scope`'s sentence onto the alt text, in the story's language ("At this size, the chart draws only"). |
| `evidenceLevels` | 3. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Find a column's index by
name (`data.columns.findIndex((c) => c.name === "…")`). For each entity, find its row at the first
state and at the second (`data.rows.find((r) => r[ENTITY] === key && r[YEAR] === 2000)`), and read the
measure. To compute the ranking for your sentences and `check()`, do it in beat.mjs too
(`rows.map((r) => ({ ...r, gain: r.to - r.from })).sort((a, b) => b.gain - a.gain)`).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v * 10) / 10 === 5`, or the printed form), never with strict equality on the raw division.
- If a sentence says something about every row ("all of them gained"), `check()` tests it.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (title cut, wrong row in the
  accent, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
