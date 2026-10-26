# Beeswarm — what you write

The packing, the radius ladder, the callout cards, the marker rule, the type, the colours and the
layout are already done: they come from the worked example `proof/static-beeswarm-co2-per-person`
and the story's PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It
reads `data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in
the folder) draws it.

A beeswarm draws ONE circle per unit (a country, a school, a town), placed on one axis by its value
and sized so its AREA is its weight (population, pupils). It keeps every unit's identity, so the
plate can name the cases the eye lands on. The axis starts at zero.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `marks` | One `{ name, value, size }` per unit, from `data.json`: `value` places it on the axis (zero or more), `size` is its circle's area (more than zero). Ten or more marks; one per unit. |
| `marker` | The value the field is read against, drawn as a rule — COMPUTED from the data (a weighted mean, a median, a threshold the takeaway names). |
| `markerLabel` | What that rule is, with its value printed ("world average 4.7 t"). |
| `axisName` | The measure and its unit, printed at the end of the axis. |
| `ticks` | Optional: the axis ticks, e.g. `[0, 10, 20, 30, 40]`. Left out, round steps up to the largest value. |
| `tickFormat(t)` | Optional: how a tick is printed (decimal comma for the language). |
| `callouts` | One to three cards above the field: `[{ name, label, lines }]` — `name` is a mark's `name`, `label` is how it is printed (optional), `lines` are one or two COMPUTED facts about it. Name the marks a reader's eye lands on anyway: the biggest circle, the farthest one out, the takeaway's subject. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: what a circle is, what its area means, the unit, the scope, the limits the journalist named. There is no size legend: the standfirst says it. |
| `reading` | The reading line in forms, longest first ("Reading: position is the rate, area is the number of people."). `[]` if none. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the swarm. |
| `evidenceLevels` | How many levels of evidence the plate ranks (4 in the worked example). |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows are arrays in `columns` order. Find each column by name, then map every row to a mark:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, VALUE, SIZE] = [col("unit_name"), col("rate"), col("weight")];
const marks = table.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]), size: Number(r[SIZE]) }));
```

If data.json holds several years or groups, filter to ONE before mapping (one mark per unit — the
render refuses two marks with one name). A weighted mean is `Σ value×size / Σ size`.

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
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (a card on the wrong circle,
  the swarm squeezed into a strip, wrong number), fix `beat.mjs` with a small `edit_file`, render and
  look again. "The swarm does not fit its band" means: give shorter forms of the title, standfirst or
  reading — never narrow the axis.
