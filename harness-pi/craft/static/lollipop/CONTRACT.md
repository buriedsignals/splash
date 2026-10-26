# Lollipop — what you write

The stems, the heads, the two tints, the change row, the names, the type, the colours and the layout
are already done: they come from the worked example `proof/static-lollipop-co2-per-person` and the
story's PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the
folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

A lollipop plate draws each entity at TWO states (two years, two surveys) as two stems from zero:
the earlier state in a light tint, the later at full strength, a triangle and the change in per cent
under the pair, the name under that. The subject's later head is ringed. Values are printed above
the heads, so there is no value axis.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `pairs` | One `{ key, name, before, after }` per entity, 2 to 8: `before` is the value at the first state, `after` at the second, `name` the label printed. Values are zero or more, and `before` is not 0 (the change in per cent is computed from it). |
| `subject` | The `key` of the pair the takeaway is about. Its later head is ringed and its name and change are set in the accent. |
| `from` / `to` | The two states, printed under each pair's stems (`2000`, `2023`). |
| `unit` | The measure and its unit, printed above the plot ("tonnes of CO₂ per person"). |
| `rule` | One sentence printed under the plate saying how the pairs were chosen ("Selection: the 6 countries with the largest total in 2023"), with the count computed. |
| `format(v)` | How a value above a head is printed, in the story's language. Enough decimals that close values differ. |
| `formatChange(v)` | Optional: how the change in per cent is printed, sign first (default `+198 %` / `−33 %`). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what is measured, the unit, the scope, which tint is which date, the limits the journalist named. |
| `reading` | One or two "how to read" sentences, longest first (each stem starts at zero; the triangle gives the direction). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `{ pairs, subject }`). |
| `evidenceLevels` | 4. |
| `check({ pairs, subject })` | Throws if the data no longer supports the title. render-beat.mjs passes the pairs with their computed `change` (per cent). |

## Reading the data

Each row of `data.json` is an array; find columns by name, never by position:

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, BEFORE, AFTER] = [col("place"), col("value_start"), col("value_end")];
```

If the two states are rows rather than columns (one row per place per year), read each place's
value at each year and build one pair per place. If the table holds more than eight entities, keep
the subject and the largest others by a rule you compute, and print that rule in `rule`.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses ("the copy leaves the stems … px"), add a shorter title, standfirst or reading form. If the
  picture is wrong (wrong pair ringed, wrong number), fix `beat.mjs` with a small `edit_file`, render
  and look again.
