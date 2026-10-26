# Box plot — what you write

The boxes, the whiskers, the sample dots beside each box, the n row, the value axis, the type, the
colours and the layout are already done: they come from the worked example
`proof/more-boxplot-france-co2-decades` and the story's PALETTE.md and DIRECTION.md. You write ONE
file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
plate says. `render-beat.mjs` (already in the folder) draws it.

A box plot compares the DISTRIBUTIONS of two to twelve groups (decades, regions, categories): each
box is the middle half of its group's readings, the line is the median, the whiskers reach the last
reading inside 1.5 × IQR, and the readings beyond are drawn as points. You give the readings; the
render computes the quartiles and whiskers itself (`summarizeDecade` in `DecadeBoxplot.tsx`).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `groups` | `[{ label, values }]`, one per box, in reading order: `label` names the group ("1970s", "North"), `values` holds its raw readings (four or more each). |
| `subject` | The `label` of the group the takeaway is about. It is drawn in the accent, its median printed. |
| `unit` | The unit printed on the top tick ("t", "%"). |
| `whiskerRule` | The whisker rule in the story's language: "1.5 × IQR" (or "1,5 × IQR"). The render draws exactly that rule. |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `reading` | The reading line naming the three statistics in words ("Reading: the box holds half the years of the decade, the line is the median, the whiskers reach 1.5 × IQR and the separate points are the years beyond."). |
| `sequence` | Optional: what the groups are, in a word ("decade", "region"). |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: what a box is, the unit, the scope, the limits the journalist named (a partial group says how many readings it holds). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the boxes. |
| `evidenceLevels` | How many levels of evidence the plate ranks (3 in the worked example). |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows are arrays in `columns` order. Filter to the one series the takeaway is about, then put each
reading in its group:

```js
import { summarizeDecade } from "./DecadeBoxplot.tsx";
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [YEAR, VALUE] = [col("year"), col("value")];
const byGroup = new Map();
for (const r of table.rows) {
  const label = `${Math.floor(Number(r[YEAR]) / 10) * 10}s`;
  if (!byGroup.has(label)) byGroup.set(label, []);
  byGroup.get(label).push(Number(r[VALUE]));
}
const groups = [...byGroup].map(([label, values]) => ({ label, values }));
// For the numbers in your sentences and in check(): the same summary the render draws.
const summaries = groups.map((g) => summarizeDecade(g.label, g.values)); // { label, n, q1, median, q3, whiskerLo, whiskerHi, outliers }
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- A box's median is computed with `summarizeDecade`, never by hand: your sentences and the drawn box must agree.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong box in the accent,
  boxes flattened into a strip, wrong number), fix `beat.mjs` with a small `edit_file`, render and
  look again. "The copy leaves the distributions … px" means: give shorter forms of the title and
  standfirst.
