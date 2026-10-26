# Connected scatter — what you write

The two circles per entity (hollow for the earlier state, filled for the later), the bowed dotted
arc that joins them, the label seats with their fallback to a short code and a leader, the axes, the
type, the colours and the layout are already done: they come from the worked example
`proof/static-connected-scatter-lowcarbon` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
plate says. `render-beat.mjs` (already in the folder) draws it.

A connected scatter places 3 to 20 entities on TWO measures at once (x and y, both from zero) at TWO
states (two years), and joins each entity's two points. The reader reads the DIRECTION of each arc:
up means more of y, right means more of x. The two measures must be independent — not a level and
the same level's share of the group, which puts every point of one year on a straight ray.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `entities` | One `{ name, label, code, from: { x, y }, to: { x, y } }` per entity, from `data.json`: `name` identifies it, `label` is how it is printed (optional), `code` is a short form (3 letters) printed when the label finds no room (optional), `from`/`to` are its two states, every value zero or more. |
| `subject` | The `name` of the entity the takeaway is about. It is drawn in the accent. |
| `from` | The earlier state's name ("2000"). |
| `to` | The later state's name ("2024"). |
| `xName` | The x measure and its unit, printed at the end of the x axis. |
| `yName` | The y measure and its unit, printed above the y axis. |
| `xTicks` | Optional: the x axis ticks. Left out, round steps up to the largest x. |
| `yTicks` | Optional: the y axis ticks; the y axis runs from 0 to the last one (`[0, 25, 50, 75, 100]` for a share in %). Left out, round steps up to the largest y. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: which circle is which state, what each axis is, the subject's move in computed numbers, the limits the journalist named. |
| `reading` | The reading line in forms, longest first ("Reading: going up means …; going right means …"). `[]` if none. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the arcs. |
| `evidenceLevels` | How many levels of evidence the plate ranks (4 in the worked example). |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows are arrays in `columns` order. For every entity, read its row at each of the two states and
compute the two measures:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, A, B] = [col("name"), col("year"), col("measure_a"), col("measure_b")];
const rowOf = (name, year) => table.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year);
const state = (name, year) => { const r = rowOf(name, year); return { x: Number(r[A]), y: Number(r[B]) }; };
const names = [...new Set(table.rows.map((r) => r[NAME]))];
const entities = names.map((name) => ({ name, from: state(name, 2000), to: state(name, 2024) }));
```

If a measure is a share, compute it from the columns that make it (part ÷ total × 100), as the
worked example does — never read a column that is not in `data.json`.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- `toLocaleString("fr-FR")` (and some other locales) prints narrow no-break spaces no typeface covers: replace `   ` with a plain space.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong entity in the accent,
  names unreadable, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again. "No
  rung of this beat's copy leaves a plot that … names all N entities" means: give shorter forms of the title, standfirst
  or reading, or short `code`s.
