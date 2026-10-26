# Box plot (web) — what you write

The page is already designed: it comes from the worked example `proof/web-boxplot-france-co2-decades`
and the story's PALETTE.md and DIRECTION.md. The boxes (quartiles, median, Tukey whiskers at
1.5 × IQR, hollow outliers), every reading drawn beside its box, the fitted axis, the colours, the
type and the INTERACTION are done — every reading answers hover, tap and Tab with where it sits in
its own group, and a "measure against" control lays one group's three levels (Q1, median, Q3) flat
across every box while one sentence says how many boxes sit wholly above and below that band, which
ones cut it, and how many readings of other groups fall inside it. With JavaScript off the page is
the complete static plate. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
groups and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes the
quartiles, the fences and every comparison, draws the page, checks it in a real browser and prints
`look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `groups` | `[{ label, readings: [{ name, value }] }]`, one per box, in reading order: `label` names the group ("1970s", "North"); each reading has a `name` (its year, its place — printed in its tooltip) and its raw `value`. Two to twelve groups, four readings or more each. |
| `subject` | The `label` of the group the takeaway is about. It is drawn in the accent. |
| `unit` | The unit of the values ("t CO₂ per person"). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). Medians are printed with it. |
| `detail(r)` | The tooltip sentence for one reading; the page prints its name before it. `r` is `{ name, value, group, n, q1, median, q3, isOutlier, aboveMedian }`: `group` = its group's label, `n` = readings in its group, `q1`/`median`/`q3` = its group's, `isOutlier` = beyond the 1.5 × IQR fences, `aboveMedian` = above its group's median. |
| `subjectNote` | The note above the plot naming the subject group ("peak: 1970s, median 9.96"). Short. |
| `subjectNoteShort` | A shorter form, printed under the plot on a phone ("peak, median 9.96"). |
| `levelLabel` | The control's legend ("Measured against"). |
| `noneLabel` | The untouched option's words ("No reference"). |
| `announce(c)` | What a screen reader hears for one group's option. Must contain `c.label`. |
| `note(c)` | The sentence shown when that group is chosen. Must state `format(c.q1)` and `format(c.q3)`. `c` is `{ label, n, q1, median, q3, groups, above, below, overlapping, strangers }`: `above` / `below` = how many other boxes sit wholly above / below its band; `overlapping` = the labels of the other boxes that cut it; `strangers` = how many readings of other groups fall inside its band; `groups` = how many boxes. |
| `ruleWords` | Optional: the words printed on the three laid rules, `{ q1, median, q3 }`. Default: "Q1", "median", "Q3" (French: "médiane"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a box is (quartiles, median, whiskers at 1.5 × IQR, outliers hollow — name them), the unit, the scope, the limits the journalist named (a partial group says how many readings it holds). |
| `reading` | One sentence telling the reader what they can do: choose a group; hover, tap or tab any reading. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the boxes. |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `yTicks` | Optional. Leave it out; it is fitted to the readings. |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows are arrays in `columns` order. Filter to the one series the takeaway is about, then put each
reading in its group:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [YEAR, VALUE] = [col("year"), col("value")];
const rows = table.rows.map((r) => ({ year: Number(r[YEAR]), value: Number(r[VALUE]) }));
const decades = [...new Set(rows.map((r) => Math.floor(r.year / 10) * 10))].sort((a, b) => a - b);
const groups = decades.map((d) => ({
  label: `${d}s`,
  readings: rows.filter((r) => Math.floor(r.year / 10) * 10 === d).map((r) => ({ name: String(r.year), value: r.value })),
}));
```

For the numbers in your sentences and in `check()`, compute medians with the SAME quantile the
render uses (linear interpolation):

```js
const quantile = (sorted, p) => { const h = (sorted.length - 1) * p, lo = Math.floor(h); return sorted[lo] + (sorted[Math.ceil(h)] - sorted[lo]) * (h - lo); };
const median = quantile(values.sort((a, b) => a - b), 0.5);
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `c`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
