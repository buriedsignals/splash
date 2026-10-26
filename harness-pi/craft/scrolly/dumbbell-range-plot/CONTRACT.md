# Dumbbell (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-dumbbell-life-expectancy-gains`
and the story's PALETTE.md and DIRECTION.md. One row per entity — name, a light dot for `from`, a dark
dot for the playhead's year, the bar between them, the gain at the right — on one fitted value scale.
Colours, type, layout and the CHOREOGRAPHY are done. A dumbbell shows two states and the gap between
them; the scroll lets the reader watch the second state get there year by year, including a step back
the two ends of the plate hide. The graphic stays fixed while six cards of prose travel up over it, and
the reader's scroll moves the picture continuously from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | every row's dot at `from`, the rows ordered by that value | `cards.start`, `notes.start` |
| 2 | each second dot travels right, year by year, to `dipFrom`, a bar drawn behind it, the year counting in the header | `cards.rise`, `notes.rise` |
| 3 | the dots move back to `dipTo`, the `dipFrom` value left as a dashed ring; the two largest losses written | `cards.dip`, `notes.dip`, `lossLabel` |
| 4 | on to `to`: the dumbbells finished, every gain written in its column | `cards.gain`, `notes.gain`, `gainLabel` |
| 5 | the rows travel into gain order; the smallest gain kept, the rest stepping back | `cards.sort`, `notes.sort` |
| 6 | the static plate, sorted by gain | `limits`, `notes.reading` |

The orders, the step back and the gains are computed; the largest and the smallest gain are named in
the accent. With JavaScript off the page shows card 6's rows, every value and gain written, and every
card's words. You do not change any of that.

This choreography needs a step back most rows share between `dipFrom` and `dipTo` (at least two rows
must fall). Every value on the stage is written with a decimal comma and one decimal, so the story's
numbers are written with a decimal comma too.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every card function, every note and `alt` receive `r`, computed by the render from your `rows`. A
row's reading is `{ key, label, series, start, atDipFrom, atDipTo, end, gain, dip }`: the values at
`from`, `dipFrom`, `dipTo` and `to`; `gain` = `end − start`; `dip` = `atDipTo − atDipFrom` (negative
when the row stepped back). `gainLabel(row)` and `lossLabel(row)` receive one row's reading.

| Field | What it is |
|---|---|
| `r.count` | how many rows |
| `r.from`, `r.dipFrom`, `r.dipTo`, `r.to` | your four years |
| `r.rows` | every row's reading |
| `r.byStart`, `r.byGain`, `r.byEnd` | the rows from the highest start / the largest gain / the LOWEST end |
| `r.highestStart`, `r.lowestStart` | the first and last row of card 1 |
| `r.risen` | the rows above their start at `dipFrom` |
| `r.fell`, `r.worstDip`, `r.secondDip` | the rows that stepped back, and the two largest losses (card 3) |
| `r.gained` | the rows above their start at `to` |
| `r.most`, `r.least` | the largest and the smallest gain (named in the accent; card 5 keeps `r.least`) |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ key, label, series }` per entity (3 to 16): `key` the data's own name, `label` printed, `series` ONE value per year from `from` to `to`, in year order. Do not sort; do not compute the gain — the render does both. |
| `from` / `dipFrom` / `dipTo` / `to` | Four whole years in order: the start, the last year before the step back, its bottom, the end. |
| `unit` | The unit line ("life expectancy at birth, in years"). |
| `yearFirst` | The header's year on card 1 ("in 2000"). |
| `yearLabel(year)` | The header's year from card 2 on, for the year it is given ("from 2000 to " + year). |
| `format(v)` | How a value or a change is printed, one decimal with a decimal comma ("78,6"). |
| `gainLabel(row)` | A row's gain in the right column, signed, stating `format(Math.abs(row.gain))` ("+5,0 years"). |
| `lossLabel(row)` | Card 3's loss for the two rows that lost most, stating `format(Math.abs(row.dip))` ("−2,5 years"). |
| `cards` | `{ start(r), rise(r), dip(r), gain(r), sort(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.highestStart.start)` and `format(r.lowestStart.start)`; card 3 `r.fell.length`, `format(Math.abs(r.worstDip.dip))` and `format(Math.abs(r.secondDip.dip))`; card 4 `format(r.most.gain)`; card 5 `format(r.least.gain)` and `format(r.least.end)`. |
| `notes` | `{ start(r), rise(r), dip(r), gain(r), sort(r), reading(r) }` — the short accent note in the header while each card is read. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the rows, the largest and the smallest change (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: the four years are not in order; a row's `series`
does not hold one value per year; there are fewer than 3 or more than 16 rows; fewer than two rows
fell between `dipFrom` and `dipTo`; `format` writes a decimal point; a card or a label does not state
its figure; or a card, a note, a label or the alt states a number no figure of `r` rounds to (sign
aside).

## Reading the data

Rows are arrays in `columns` order. Read one value per entity per year:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("region"), col("year"), col("amount")];
const years = Array.from({ length: 2023 - 2000 + 1 }, (_, i) => 2000 + i);
const valueOf = (name, year) => Number(table.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year)[VALUE]);
const names = [...new Set(table.rows.map((r) => r[NAME]))];
const rows = names.map((name) => ({ key: name, series: years.map((y) => valueOf(name, y)) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, a label or the alt is taken from `r` (through `format()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong row in the accent, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
