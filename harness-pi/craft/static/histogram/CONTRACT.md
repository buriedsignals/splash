# Histogram — what you write

The bins, the bin names, the threshold line, the counted share, the type, the colours and the layout
are already done: they come from the worked example `proof/static-carbon-footprint-spread` and the
story's PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the
folder) counts the bins and draws them.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then
write this story's from scratch with `write_file`.

A histogram shows how MANY readings fall in each range. The bars have no subject, so they are all
muted; the accent goes on the threshold the takeaway counts against, with the share on its left
stated beside it ("127 countries of 213 below 4 tonnes").

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `observations` | One `{ name, value }` per reading (one per country, per town…), from `data.json`. At least 20. Leave out aggregate rows (a world or regional total is not one more reading). |
| `binStart` | The first bin's lower edge, at or under the smallest value (often `0`). |
| `binWidth` | The width of every bin, a round number (1, 2, 4, 5, 10…). |
| `binCount` | How many bins, 4 to 20. The LAST bin is open: it holds everything at or above its lower edge, and is named "36+". It must hold a few outliers, not a quarter of the data. |
| `unit` | The variable and its unit, printed under the bin names ("tonnes of CO₂ per person, 2023"). The part before the first comma is used when the callout is short of room. |
| `threshold` | The cut the takeaway counts against (e.g. `4` in "6 in 10 emit less than 4 tonnes"), inside the bins. |
| `words` | The callout's words in the story's language: `{ entity, of, below }`, e.g. `{ entity: "countries", of: "of", below: "below" }` gives "127 countries of 213 below 4 …". |
| `formatEdge(v)` | Optional: how a bin edge and the threshold are printed (default: the bare number). Use it for a decimal comma. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what one reading is, the year, that each counts for one, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt({ bins, count, total, share })` | The alt text (a string, or a function of what render-beat counted). |
| `evidenceLevels` | 3. |
| `check({ bins, count, total, share })` | Throws if the data no longer supports the title. render-beat.mjs passes the bins it counted and `count` of `total` readings below `threshold` (`share` = count / total). |

## Reading the data

Each row of `data.json` is an array; find columns by name, never by position:

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE] = [col("place"), col("value")];
const observations = data.rows.map((r) => ({ name: r[NAME], value: Number(r[VALUE]) }));
```

If the table holds several years or groups, filter to the ONE the takeaway is about first, so each
place appears once.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(share * 10) === 6` for "6 in 10", `Math.round(share * 100) === 60` for "60 %"), never with strict equality on the raw division.

- Every number in a sentence is computed from `data.json`, never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render
  refuses ("open last bin holds", "only 2 bins hold"), change `binWidth` / `binCount`. If the picture
  is wrong (no threshold line, callout missing), fix `beat.mjs` with a small `edit_file`, render and
  look again.
