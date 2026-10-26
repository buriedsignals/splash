# Radar (spider, web) — what you write

The page is already designed: it comes from the worked example `proof/web-radar-electricity-mix`
and the story's PALETTE.md and DIRECTION.md. Two shapes on the same 5 to 10 spokes (the subject in
the accent, the other in a neutral), round rings, the spoke names outside the ring, the colours, the
type and the INTERACTION are done. A radar's AREA — what the eye judges — moves with WHICH spokes
are counted while no number does, so a "spokes counted" control takes spokes out of the COUNT: every
spoke keeps its angle and name, every vertex stays where it is, and the outline stops passing
through the set-aside ones. The two areas and their ratio are printed on the plot in every state.
Every vertex answers hover, tap and Tab with its value and the other shape's on the same spoke. With
JavaScript off the page is the complete static plate and the control still works (CSS only). The
frame never stretches (a radius must mean the same number in every direction). You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
spokes, the two shapes, the subsets the reader may count and the WORDS. `render-beat.mjs` (already
in the folder) measures every area on the coordinates the page draws, draws the page, checks it in a
real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `axes` | 5 to 10 spokes, clockwise from twelve o'clock: `[{ key, name }]`. `name` (≤ 16 characters) is printed outside the ring. The order is an editorial decision; say it in `limits` if it matters. |
| `shapes` | Exactly 2: `[{ key, name, values, amounts? }]`. `values` = one number ≥ 0 per axis `key` (usually a share in %, COMPUTED as value / that item's total × 100); `amounts` = optional, the absolute value per axis key, handed to `detail()`. |
| `subject` | The `key` of the shape the takeaway is about. It is drawn in the accent. |
| `unit` | Optional: the unit of `values` ("%"). |
| `format(v)` | Optional: how a value is printed. |
| `ringLabel(v)` | How the outer ring's value is printed ("70 %"). |
| `detail(v)` | The tooltip of one vertex. `v` is `{ name, axis, value, amount, otherName, otherValue, aside }`: `name` = the shape, `axis` = the spoke, `amount` = from `amounts` (or null), `other…` = the other shape on the same spoke, `aside` = true when the spoke is out of the count — then the sentence must add that the outline no longer passes through it. |
| `countLabel` | The control's legend ("Sources counted"). |
| `noneLabel` | The untouched option ("all eight"). |
| `noneNote` | The sentence shown before anything is pressed, saying what pressing does: spokes leave the COUNT, not the picture. |
| `readout(r)` | The line printed on the plot in every state: the two areas and their ratio (`r.areaA`, `r.areaB`, `r.ratio`). |
| `counts` | 1 to 3 editorial subsets — a cut somebody actually argues about — each `{ label, axes, announce(r), note(r), alt(r) }`: `axes` = the axis keys COUNTED (at least 3, not all); `announce` must contain `label` word for word; `note` = the sentence under the control; `alt` = the alt text in that state. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what the values are a share of, the year, the limits the journalist named. |
| `reading` | One or two sentences: the area is an editorial decision; hover a vertex — a string, or a function of the same object `check()` receives. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text of the untouched state (a string, or a function of the same object `check()` receives). |
| `evidenceLevels` | Optional, 2. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check({ plate, options, span, ratioSpan, flipped, everyCount })` | Throws if the data no longer supports the title (or a note's claim, e.g. `options[1].turnsOver`). `plate` = the reading with every spoke, `options` = each subset's reading (with its `label`), `span` = `{ lo, hi }` the subject's area over every count that sets at most two spokes aside, `ratioSpan` = the same for the ratio, `flipped` = how many of those `everyCount` counts turn "who covers more" over. |

A count reading `r` is `{ counted, aside, areaA, areaB, ratio, plateAreaA, plateAreaB, plateRatio, turnsOver, nameA, nameB }`:
`counted` / `aside` = the spoke names in / out of the count, `areaA` / `areaB` = the subject's / the
other shape's area as % of the outer ring's disc, `ratio` = `areaB / areaA`, `plate…` = the same with
every spoke counted, `turnsOver` = true when this count reverses which shape covers more. A shape
`A` is always the subject.

The render refuses when setting one or two spokes aside barely moves the subject's area (under a
factor of 2): then the gesture shows nothing and a static radar is the honest choice.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const AXES = ["alpha", "beta", "gamma", "delta", "epsilon"];
const shapes = ["A", "B"].map((code) => {
  const r = data.rows.find((row) => row[col("code")] === code && row[col("year")] === 2024);
  const total = AXES.reduce((s, k) => s + Number(r[col(k)]), 0);
  return { key: code, name: r[col("place")], values: Object.fromEntries(AXES.map((k) => [k, (Number(r[col(k)]) / total) * 100])) };
});
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v * 10) / 10 === 67.7`), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`v`, `r`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong shape in the
  accent, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
