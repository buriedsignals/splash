# Stacked bar — what you write

The bars, the two segments, the numbers inside them, the totals, the key, the type, the colours and
the layout are already done: they come from the worked example `proof/static-stacked-bar-lowcarbon-growth`
and the story's PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the folder)
draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write this
story's from scratch with `write_file`.

## What this kit draws

Horizontal bars of TWO stacked segments: a base (`level`, drawn pale) and what sits on top of it
(`growth`, drawn in the accent), with the total printed past the bar's end. The usual case is
`[earlier level, what was added since]` — never `[earlier level, later level]`, so the reader does no
subtraction. Both segments must be zero or more: if some rows shrank, this is not the right kit (a
waterfall or a diverging bar is). At most 12 bars.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, level, growth }` per bar, from `data.json`, at most 12, sorted by the quantity the takeaway ranks (usually `growth`, largest first). `growth` is COMPUTED (later value minus earlier value). The total is computed by the render. |
| `highlight` | The `name`(s) of the bar(s) the takeaway is about; their labels and totals are drawn in the accent. Each must be a row's `name`. |
| `segments` | `{ level, growth }`: the two segment names printed in the key ("produced in 2000", "added since"). |
| `order` | Optional: what the bars are sorted by, in a few words ("growth since 2000"). |
| `unit` | The unit printed above the totals ("TWh"). |
| `format(v)` | How a value is printed, in the story's language. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: unit, scope, the limits the journalist named; if rows were left out, say how many. |
| `reading` | One or two short "how to read" forms (pale segment = earlier, full segment = added, total at the end). May be dropped when space is short. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of the drawn rows). |
| `evidenceLevels` | 4. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows of `data.json` are arrays; find a column's index by name:

```js
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("name"), col("year"), col("value")];
const at = (n, y) => table.rows.find((r) => r[NAME] === n && Number(r[YEAR]) === y);
// level = Number(at(n, FROM)[VALUE]); growth = Number(at(n, TO)[VALUE]) - level
```

When the 12 bars are a selection, sort all rows first, keep the 12, and check that every name the title
names is among them.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong bar in the accent, wrong
  number, title cut), fix `beat.mjs` with a small `edit_file`, render and look again.
