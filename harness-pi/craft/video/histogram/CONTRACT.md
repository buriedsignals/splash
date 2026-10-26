# Histogram (video) — what you write

The video is already designed: it comes from the worked example `proof/video-histogram-carbon-footprint-spread`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (19.5 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then the
zero line and the bin names; a tick per reading is swept along the axis; every tick widens into one
cell and stacks into its bin, all bins rising at one pace, the count axis at the left; the
`threshold` cut — the edge between the first two bins — rises in the accent with the first bin's
count over it; the bins past the second rise and slide, keeping their lengths, onto the second
bin, its count climbing to the whole tail; seams cut both columns into TENTHS of the whole ("6 in
10"); then the seams close, the tail's bins slide back, the whole histogram, the credit on one line.
There is no standfirst and no sentence on screen: bin names and counts only. You do not change any
of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) bins the
readings, counts the readings under the cut and their share in tenths, hands them to `check()`,
lays the frames out, renders twelve stills, prints `look at: <png>`, then renders the mp4 (about a
minute).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `observations` | Every reading as `{ name, value }`, from `data.json` (20 to 600 of them). One cell each. |
| `binStart` | Optional: where the first bin starts (default 0). No reading may be under it. |
| `binWidth` | The width of one bin, in the readings' unit. |
| `binCount` | How many bins (4 to 14); the last one is open ("36+"). |
| `threshold` | The cut the takeaway counts against. It must be the edge between the first two bins: `binStart + binWidth`. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator in bin names. |
| `evidenceLevels` | Optional, 2. |
| `check({ share, under, total, bins })` | Throws if the data no longer supports the title. It is handed what the video counts: `share` (under ÷ total), `under`, `total`, and every bin's count. |

The render refuses, saying what to change, when:
- `threshold` is not the edge between the first two bins;
- no reading is under the cut, or all of them are, or no reading lies past the second bin (nothing to stack);
- the two columns do not cut into ten tenths at this count, or a tail bin is taller than the column
  it slides across (try a wider `binWidth`);
- a reading is under `binStart`, or there are fewer than 20 or more than 600;
- a bin name or the credit does not fit the frame.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE] = [col("region"), col("amount")];
const observations = data.rows
  .filter((r) => Number.isFinite(Number(r[VALUE])))
  .map((r) => ({ name: r[NAME], value: Number(r[VALUE]) }));
```

Leave out aggregate rows (a "World" or "Total" row is not a reading).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says "N in 10", `check()` compares `Math.round(share * 10)` with N, using the `share` it is handed — never a count typed by hand.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole histogram, the cut ruled with the first bin's count). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, a wrong count, the wrong subject), fix `beat.mjs` with a small
  `edit_file`, render and look again.
