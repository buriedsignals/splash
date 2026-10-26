# Population pyramid — what you write

The two mirrored halves, the spine, the axis on both sides, the names of the halves, the crossing
mark, the type, the colours and the layout are already done: they come from the worked example
`proof/static-swiss-age-pyramid` and the story's PALETTE.md and DIRECTION.md. You write ONE file,
`beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's plate
says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `entity` | The population drawn ("Suisse", "Geneva canton"). |
| `bands` | One `{ band, left, right }` per age band, from `data.json`, YOUNGEST FIRST (the foot of the pyramid). `left` and `right` are the two groups' counts (or shares), never negative. |
| `leftName` | The name of the left half, drawn above it ("Men"). The left half is drawn in the accent. |
| `rightName` | The name of the right half ("Women"). |
| `crossing` | The first band where the two halves change places, COMPUTED from `bands`, or `null` if they never do. The render refuses a band that is not the data's crossing. |
| `crossingLabel(name, band)` | The words drawn at the crossing, in the story's language (`` `${name} ahead from ${band}` ``). |
| `tickFormat(v)` | Optional. How an axis tick is printed; default `300000 → "300k"`. Give one with decimals when the halves are shares. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: population, year, unit, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the pyramid. |
| `evidenceLevels` | 3. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

A pyramid usually comes as one row per band with a column per group (`band, group_a, group_b`) or
one row per band AND group (`band, group, count`). Build `bands` by column name, never by index:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [BAND, A, B] = [col("band"), col("group_a"), col("group_b")];
const bands = table.rows.map((r) => ({ band: String(r[BAND]), left: Number(r[A]), right: Number(r[B]) }));
```

In the long shape, filter the rows of each group and pair them by band; filter to ONE year and ONE
area first (the render refuses two rows for one band). Keep the data's band order youngest first.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- A pyramid draws two counts mirrored about a spine. A gain or a loss per band is not a pyramid: the render refuses negative halves.
- The crossing label says "ahead from this band on". If the halves change places and then change back, the render refuses: draw a narrower band range or set `crossing: null`.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
