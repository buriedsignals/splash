# Beeswarm (web) — what you write

The page is already designed: it comes from the worked example `proof/web-beeswarm-co2-per-person`
and the story's PALETTE.md and DIRECTION.md. The packing, the radius ladder, the two rules, the two
named cases, the axis, the colours, the type and the INTERACTION are done — a "weigh by" control
re-weighs the swarm: a circle's AREA is the unit's size (e.g. its population), or the same for every
unit, or its total (value × size, e.g. the country's own tonnes), and the swarm re-packs while a
caret slides to where half that weight lies. Every circle answers hover, tap and Tab with a different
reading under each weighting. With JavaScript off the page is the complete static swarm, weighed by
size. You do not change any of that.

A beeswarm draws ONE circle per unit (a country, a school, a town), placed on one axis by its value.
This page's control only means something when `value` is a RATE PER UNIT OF `size` (tonnes per
person × people = tonnes; beds per resident × residents = beds): the third weighting multiplies them.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
marks and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes the
three packings and every reading, draws the page, checks it in a real browser and prints
`look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `marks` | One `{ name, value, size }` per unit, from `data.json`: `value` places it on the axis (zero or more), `size` is its weight (more than zero). Ten or more marks; one per name. |
| `unit` | The short unit printed after the last tick ("t/person"). |
| `format(v, decimals)` | How a value is printed, in the story's language (`decimals` defaults to 1). |
| `marker` | The value of the dotted rule the field is read against — COMPUTED (e.g. the size-weighted mean `Σ value×size / Σ size`). |
| `markerLabel` | That rule's name with its value ("world average 4.58"). Short. |
| `median` | The median unit's value: sort the marks by value and take `sorted[Math.floor(n / 2)].value`. The render checks it. |
| `medianLabel` | That rule's name with its value ("median country 3.14"). Short. |
| `centreLabel` | The words under the caret marking where half the weight lies ("centre of mass"). |
| `callout(m)` | The label of a named case. The page names two, chosen by the render: the largest circle and the farthest one out. `m` is `{ name, value, size, total, isBiggest, isFarthest }`. Keep it short. |
| `weighLabel` | The control's legend ("The swarm weighs"). |
| `views` | The three weightings' words: `{ size: { label, announce }, count: { label, announce, note(w) }, total: { label, announce, note(w) } }`. `label` is one or two words ("people", "countries", "CO₂"); `announce` is what a screen reader hears and must contain `label`. `size` is the landing picture and takes no note. |
| `note(w)` | The sentence shown when that weighting is chosen. Must state `format(w.centre, 2)`. `w` is `{ centre, centres: { size, count, total }, count, median, marker, sizeTotal, grandTotal, underMarker: { size, count, total }, heaviest: { name, value, size, total, sharePct } }`: `centre` = the value where half this weighting's weight lies; `underMarker.*` = percent of the sizes / units / totals strictly below `marker`; `heaviest` = the unit with the largest total, `sharePct` its percent of `grandTotal`. |
| `detail(m, view)` | The tooltip sentence for one circle under one weighting (`view` is `"size"`, `"count"` or `"total"`); the page prints the name before it. `m` is `{ name, value, size, total, count, rank, totalSharePct, belowSizePct, belowCountPct, belowTotalPct }`: `rank` = its place from the lowest value (1 = lowest); `below*Pct` = percent of the sizes / units / totals strictly below its value; `totalSharePct` = its total as a percent of all totals. Each weighting asks its own question. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a circle is, what its area means, the unit, the scope, the limits the journalist named. |
| `reading` | One or two sentences: what the three centres say, and that the reader can hover, tap or tab any circle and choose a weighting. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the swarm. |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `tickStep` | Optional: the axis step. Leave it out; it is derived. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses when the largest circle sits in the right half of the axis or is also the
farthest one out (the page names one case on each side), and when half the weight sits at the same
value under all three weightings (the control would move nothing).

## Reading the data

Rows are arrays in `columns` order. Find each column by name, then map every row to a mark:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, VALUE, SIZE] = [col("unit_name"), col("rate"), col("weight")];
const marks = table.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]), size: Number(r[SIZE]) }));
```

If data.json holds several years or groups, filter to ONE before mapping (one mark per unit — the
render refuses two marks with one name). Leave out aggregate rows ("World", "Total").

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`m`, `w`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong (a label on the wrong
  circle, a sentence cut, a wrong number), fix `beat.mjs` with a small `edit_file`, render and look again.
