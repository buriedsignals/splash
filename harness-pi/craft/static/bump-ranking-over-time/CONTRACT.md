# Bump (ranking over time) — what you write

The rank rows, the lines that cross, the names at both edges, the exits, the year ticks, the type,
the colours and the layout are already done: they come from the worked example
`proof/static-bump-emitter-rank` and the story's PALETTE.md and DIRECTION.md. You write ONE file,
`beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's plate
says. `render-beat.mjs` (already in the folder) draws it.

A bump chart draws, year by year, WHO holds each of the top N ranks of one measure, and draws every
entity that held one at least once; one that leaves the top N stops where it left. The rank is a
position, not a size. You give the raw values; the RANKS are computed by `ranks.mjs` (higher value =
rank 1), for the drawing and for your sentences.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `values` | One `{ entity, year, value }` per entity per year, from `data.json`: the measure that is ranked. Entity names are printed as given — map them into the story's language here if they are not. |
| `slots` | How many ranks are drawn (3 to 15; 10 in the worked example). |
| `subject` | The `entity` the takeaway is about (it must hold a drawn rank at least once). It is drawn in the accent, on top and heavier. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst in forms, longest first: the measure ranked, the years, who is drawn, that a rank is not a size, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the ranking. |
| `evidenceLevels` | How many levels of evidence the plate ranks (3 in the worked example). |
| `check()` | Throws if the data no longer supports the title. |

## Reading the data

Rows are arrays in `columns` order. Keep one row per entity per year (drop aggregates — regions, a
world total — which would take ranks they do not hold), then rank with `ranks.mjs`:

```js
import { rankTracks } from "./ranks.mjs";
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("name"), col("year"), col("value")];
const values = table.rows
  .map((r) => ({ entity: r[NAME], year: Number(r[YEAR]), value: Number(r[VALUE]) }))
  .filter((v) => Number.isFinite(v.value) && v.year >= 2000);
const { years, everIn, rankOf } = rankTracks(values, 10);
const from = rankOf("Subject name", years[0]);               // undefined if outside the top 10 that year
const to = rankOf("Subject name", years[years.length - 1]);
```

`rankTracks` throws, by name, on two values for one entity in one year.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and rank it — never rank the raw column under a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- Ranks in sentences come from `rankOf`, never typed and never counted by hand.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (wrong line in the accent,
  names printed over each other, wrong rank), fix `beat.mjs` with a small `edit_file`, render and
  look again. "The copy leaves the rank rows … px" means: give shorter forms of the title and
  standfirst, or fewer slots.
