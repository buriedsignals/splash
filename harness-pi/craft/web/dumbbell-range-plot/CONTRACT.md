# Dumbbell (web) — what you write

The page is already designed: it comes from the worked example `proof/web-dumbbell-life-expectancy-gains`
and the story's PALETTE.md and DIRECTION.md. One dumbbell per row: a pale head at the first state, a
full head at the second, the bar between them IS the change, each level printed beside its head and
the change printed at the right. The render RANKS the rows by change, largest first. The axis is
fitted (not from zero), the colours, the key, the type and the INTERACTION are done: a YARDSTICK
control ("measured against") lets the reader pick a row and stands that row's two levels up across
every row as two dotted references, with a sentence counting who was already above its later level
and who is still below its earlier one. Every row's bar answers hover, tap and Tab with its change,
its rank and its distance from the median change. With JavaScript off the page is the complete
static plate. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's page. `render-beat.mjs` (already in the folder) ranks the rows,
computes every reading, draws the page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ key, label, from, to }` per entity (3 to 20). `key` is the data's own name, `label` is printed, `from` and `to` are the values at the two states. Do not sort; do not compute the change — the render does both. |
| `subject` | The `key` of the row the takeaway is about. Its name and change are drawn in the accent. |
| `fromName` / `toName` | The two states as strings (`"2000"`, `"2023"`), printed in the key and on the yardstick's uprights. |
| `xTicks` | Optional: the axis ticks, covering every value. Left out, round steps over the values' range. |
| `format(v)` | How a level is printed beside its head ("78,6"). |
| `gainLabel(r)` | How a row's change is printed at the right, from `r.gain` — signed ("+5,0", "−1,2"). |
| `detail(r)` | The tooltip sentence for one row's bar. Never repeat its two levels (they are printed); say its change, its rank, its distance from the median change. Every row must answer differently (start with its label). |
| `levelLabel` | The yardstick control's legend ("Measured against"). |
| `noneLabel` | The untouched option's words ("No yardstick"). |
| `announce(r)` | What a screen reader hears for one row's pill. Must contain `r.label`. |
| `note(r)` | The sentence shown under the control when that row is chosen: its rank of level at both states, `aheadThen`, `behindNow`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: the measure, the two states, why the axis does not start at zero, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: choose a row; hover or tab a row. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the list of row readings `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

### What the word functions receive

A row reading `r` is `{ key, label, from, to, gain, gainRank, count, medianGain, vsMedian, rankFrom,
rankTo, aheadThen, behindNow, isSubject }`: `gain` = `to − from`; `gainRank` = its place by change
(1 = largest); `medianGain` = the median change of all rows; `vsMedian` = `gain − medianGain`;
`rankFrom` / `rankTo` = its place by LEVEL at each state (1 = highest); `aheadThen` = how many other
rows were already, at the first state, at or above this row's level at the second state;
`behindNow` = how many other rows are still, at the second state, at or below this row's level at
the first state.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("region"), col("year"), col("amount")];
const valueAt = (name, year) => Number(table.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year)?.[VALUE]);
const names = [...new Set(table.rows.map((r) => r[NAME]))];
const rows = names.map((name) => ({ key: name, label: name, from: valueAt(name, 2000), to: valueAt(name, 2023) }))
  .filter((r) => Number.isFinite(r.from) && Number.isFinite(r.to));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- Use plain ASCII for ordinals and arrows ("1st", "then"): the embedded faces may not carry
  superscript letters or arrow glyphs, and the render refuses a page whose words a face cannot set.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
