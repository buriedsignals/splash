# Treemap (video) — what you write

The video is already designed: it comes from the worked example `proof/video-treemap-europe-capacity`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (18.7 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then the
WHOLE grows as one block from the left, its total counting («469 GW»); seams cut it into its cells,
largest first, each cell's figure and name arriving (the smallest items are folded into two
remainder cells, «25 pays» and «9 pays», split by whether they tipped); in every cell its PART (the
worked example's wind and solar) rises from the floor to its share, a midline across each; the cells
whose part is over half flood with the accent, one after another, their count climbing in the key
(«10 pays»), the others drain; the flooded cells slide into the largest cell and pack inside it,
keeping their areas, their sum named; then they slide back, the largest cell is ringed, and the
credit comes in. There is no standfirst and no sentence on screen. You do not change any of that.

The video tells ONE argument: "a group of items has tipped (its part is over half), and all of them
together still fit inside the largest one". The render refuses data where no cell tipped, where the
largest cell itself tipped, or where the tipped cells together are not smaller than the largest.
Another type or the static format must tell those.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) finds the tipped
cells, folds the small ones, packs the gather, renders fourteen stills, prints `look at: <png>`,
then renders the mp4 (about a minute and a half).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `cells` | One `{ name, value, part }` per item. `value` is its quantity (above 0: it is the cell's area); `part` is how much of it is the part the takeaway is about (0 to `value`). When data.json has several rows per item, ADD THEM UP into one cell per item. A cell whose `part` is over half its `value` has tipped. |
| `partName` | The key's word for the part ("wind + solar"). |
| `format(v)` | The figure printed in a cell, with its unit ("34,6 GW", "870 MW"), in the story's language. It also prints the remainders' and the gather's sums. |
| `wholeDivisor` | Optional: how many of the data's units one step of the whole's climbing count is (1000 to count MW in GW). The whole must count in 5 to 5000 steps. Default 1. |
| `wholeLabel(n)` | The whole's climbing count ("469 GW"), handed every whole number of steps from 0 to the total. |
| `countLabel(n)` | A count of items ("10 countries"): the key's climbing tipped count and the remainders' names. |
| `source` | The credit line in one to three forms, longest first, exactly as the storyboard records it. |
| `lang` | Optional: the story's language tag ("fr", "en"). |
| `evidenceLevels` | Optional, 4. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- a value is 0 or less, a part is below 0 or above its value, or a name is used twice;
- no cell tipped, the largest cell tipped, or the tipped cells together are not smaller than the largest;
- the whole counts in fewer than 5 or more than 5000 steps (set `wholeDivisor`);
- `countLabel` or `wholeLabel` ignores the number it is handed;
- the figures and names do not fit their cells (shorten `format()`, the names, or the source forms).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names, several rows per item:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ITEM, KIND, AMOUNT] = [col("region"), col("kind"), col("amount")];
const byItem = new Map();
for (const r of data.rows) {
  const cell = byItem.get(r[ITEM]) ?? { name: r[ITEM], value: 0, part: 0 };
  cell.value += Number(r[AMOUNT]);
  if (r[KIND] === "new") cell.part += Number(r[AMOUNT]);
  byItem.set(r[ITEM], cell);
}
const cells = [...byItem.values()];
const tipped = cells.filter((c) => c.part / c.value > 0.5);
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values) — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(share * 100) === 77`), never with strict equality on the raw division.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: every cell back, the tipped ones in the accent, the largest ringed). If the render
  refuses, read its message and fix `beat.mjs`. If the picture is wrong (a figure cut, the wrong
  cells flooded), fix `beat.mjs` with a small `edit_file`, render and look again.
