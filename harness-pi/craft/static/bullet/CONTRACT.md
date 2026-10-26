# Bullet — what you write

The tracks, the two bars per row (a thick pale one for the earlier state, a thin saturated one for
the later), the row names, the verdicts at the end of each row, the type, the colours and the layout
are already done: they come from the worked example `proof/static-bullet-low-carbon-share` and the
story's PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the
folder) draws it.

A bullet chart shows, for two to twelve rows (countries, regions), one bounded measure at two
states — the MARKER (earlier, or a target) and the MEASURE (now) — on a track that runs from zero to
a CEILING (100 for a share in %). The reader sees how far each row moved and how far is left.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, label, marker, measure }` per row, from `data.json`, in the order to draw (the worked example sorts by change, largest first): `name` identifies it, `label` is how it is printed (optional), `marker` is the earlier state, `measure` the later. Both between 0 and `ceiling`. |
| `subject` | The `name` of the row the takeaway is about. It is drawn in the accent. |
| `ceiling` | The track's end: 100 for a share in %, or the measure's real maximum. |
| `markerName` | What the marker is ("2015"). |
| `measureName` | What the measure is ("2024"). |
| `unit` | The unit printed on the last tick ("%"). |
| `format(v)` | How a value on the axis and the state labels is printed. |
| `verdict(row)` | The value printed at the end of each row, usually its change, COMPUTED: `` (row) => `+${one(row.measure - row.marker)} pts` ``. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: what the measure is, the two states, the scope, the limits the journalist named. |
| `reading` | The reading line in forms, longest first: which bar is which state ("Reading: the thick pale bar is 2015, the thin saturated one 2024."). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the rows. |
| `evidenceLevels` | How many levels of evidence the plate ranks (3 in the worked example). |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows are arrays in `columns` order. Find each column by name; for every entity, read its value at
the two states:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR, SHARE] = [col("entity"), col("year"), col("share")];
const at = (entity, year) => Number(table.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === year)[SHARE]);
const entities = [...new Set(table.rows.map((r) => r[ENTITY]))];
const rows = entities.map((name) => ({ name, marker: at(name, 2015), measure: at(name, 2024) }));
```

If the share is not a column, compute it from the columns that make it (part ÷ total × 100), as the
worked example does — never read a column that is not in `data.json`.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- The marker is a state, not a target: if the data has no target, do not call one a target in a sentence.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- `toLocaleString("fr-FR")` (and some other locales) prints narrow no-break spaces no typeface covers: replace `   ` with a plain space.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong row in the accent,
  bars past the track, wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
