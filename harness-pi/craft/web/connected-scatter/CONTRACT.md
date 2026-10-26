# Connected scatter (web) — what you write

The page is already designed: it comes from the worked example `proof/web-connected-scatter-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. Every entity is an ARROW from a ring (its earlier
state) to a head (its later state), on two measures at once. The axes, the colours, the type, the
names printed at the rings and the INTERACTION are done: a control ("the arrow shows") lets the
reader aim every head at another reading — the whole move, its horizontal leg alone, its vertical
leg alone, and, when you give every entity a `whatIf` point, a counterfactual third point. The ring
never moves. A sentence under the control says what the chosen reading shows, and a figure at the
subject's head states its move. Every arrow answers hover, tap and Tab with the entity's own
sentence. With JavaScript off the page is the complete static plate. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes the
legs, the counts and where each name goes, draws the page, checks it in a real browser and prints
`look at: <png>`.

A connected scatter places 3 to 20 entities on TWO independent measures (x and y, both from zero)
at TWO states. Every entity must move on BOTH axes (each leg is drawn as an arrow of its own).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `entities` | One `{ name, label, from: { x, y }, to: { x, y }, whatIf? }` per entity, from `data.json`: `name` identifies it, `label` is how it is printed (optional), every value zero or more. `whatIf` (optional, all or none): a third point `{ x, y }` you compute — a counterfactual such as "the later amount against the earlier total". You may add other fields (a raw amount, a growth rate): `detail()` receives them. |
| `subject` | The `name` of the entity the takeaway is about. It is drawn in the accent. |
| `from` / `to` | The two states' names ("2000", "2024"). |
| `xName` / `yName` | Each measure and its unit, printed as the axis titles. |
| `xTicks` / `yTicks` | Optional: the ticks. Left out, round steps up to the largest value of any state. |
| `xTop` / `yTop` | Optional: where the axis ends, when a head any option aims at lies above the last tick (the example: ticks to 40, `yTop: 45`). |
| `tickLabel(t)` | Optional: how a tick is printed (`(t) => \`${t} %\``). |
| `named` | Optional: the `name`s printed at their ring (at most 8; the others answer the pointer). Default: the entities whose y fell, and the subject. Must include the subject. |
| `aimLabel` | The control's legend ("The arrow shows"). |
| `tripLabel` | The untouched option's words ("The move"). |
| `options` | `{ across, up, whatIf? }`, each `{ label, announce, note(s) }`: `label` is the pill; `announce` is what a screen reader hears and must CONTAIN `label` word for word; `note(s)` returns the sentence shown under the control for that reading. `whatIf` only when entities carry `whatIf`. |
| `figure(state, r)` | The figure printed at the subject's head. `state` is `"trip"`, `"across"`, `"up"` or `"whatIf"`; `r` is the subject's reading. It MUST start with the subject's label and a colon ("France : +4,2 at home"). Keep it short. |
| `detail(r)` | The tooltip sentence for one entity. Every entity must answer differently (start with its label). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: which end is which state, what each axis is, the limits the journalist named. |
| `reading` | One sentence telling the reader what they can do: hover or tab an entity; choose what the arrow shows. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the arrows (a string, or a function of the summary `s`). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

### What the word functions receive

A reading `r` (one entity) is the entity as you gave it plus: `label`; `dx` = `to.x − from.x`;
`dy` = `to.y − from.y`; `whatIfDx`, `whatIfDy` = the whatIf point minus `from` (null without one);
`isSubject`.

The summary `s` (every `note(s)`, and `alt(s)`) is: `count`; `subject` (its reading); `entities`
(every reading); `right` / `left` (readings with `dx > 0` / `< 0`); `up` (readings with `dy > 0`,
largest rise first); `down` (readings with `dy < 0`, largest fall first); `medianDx`;
`smallestDx` / `biggestDx` (the readings with the smallest / largest `dx`); `whatIfUp` /
`whatIfDown`; `smallestWhatIfDy` / `biggestWhatIfDy` (readings, null without whatIf).

## Reading the data

Rows are arrays in `columns` order. For every entity, read its row at each state and compute the two
measures. Example with neutral names:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, A, B] = [col("name"), col("year"), col("measure_a"), col("measure_b")];
const rowOf = (name, year) => table.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year);
const state = (name, year) => { const r = rowOf(name, year); return { x: Number(r[A]), y: Number(r[B]) }; };
const names = [...new Set(table.rows.map((r) => r[NAME]))];
const entities = names.map((name) => ({ name, from: state(name, 2000), to: state(name, 2024) }));
```

If a measure is a share, compute it from the columns that make it (part ÷ total × 100) — never read
a column that is not in `data.json`.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `s`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong entity in the
  accent, a name printed over another, a wrong number), fix `beat.mjs` with a small `edit_file`,
  render and look again.
