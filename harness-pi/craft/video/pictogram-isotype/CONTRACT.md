# Pictogram / unit grid (video) — what you write

The video is already designed: it comes from the worked example `proof/video-pictogram-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (19 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then a 0 % to
100 % axis runs across the frame, and one square per unit drops onto the 5-point column of its value
as a front sweeps from 0 to 100 %; the two CUTS rise in the accent with their words and the axis parts
at them; each part's squares gather into columns from its anchor — the part under the low cut against
the left edge, the part from the high cut against the right edge, the middle part between the cuts —
the j-th square of every block landing at the same moment, each block's count climbing as its squares
land, so the smallest block stops first; then the three parts close into the pictogram, magnified, the
MIDDLE block's count ringed, and the credit comes in on one line. There is no standfirst and no
sentence on screen. You do not change any of that.

The video argues about the MIDDLE block — the units between the two cuts ("only 6 in the middle"). Its
count is the one ringed. Use it when the takeaway is about how few (or how many) lie between two
thresholds on a 0–100 % scale.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) places every unit
in its column and block, counts the blocks, lays the frames out, renders eleven stills, prints
`look at: <png>`, then renders the mp4 (about a minute and a half).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `units` | One `{ key, label, value }` per thing (10 to 120), from `data.json`: `value` is a share in %, from 0 to 100. Leave out things with no reading. One square per thing: filter to one year first. |
| `cuts` | The two thresholds the takeaway names, low then high, whole percents that are multiples of 5 (`[60, 75]`). A unit goes under the low cut, from the low to the high cut (the middle), or from the high cut. |
| `breaks` | 1 to 6 increasing numbers between 0 and 100: the edges of the shade classes inside the squares. |
| `percent(v)` | How a percent is printed on the axis (« 0 % », the cuts, « 100 % »). Returns a string. |
| `count(n)` | How a block's count is printed over it ("6 countries"). Returns a string. |
| `axisName` | What the axis measures, printed after « 100 % » at its far end ("low-carbon"); dropped by itself when the frame is too narrow. `""` for none. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `evidenceLevels` | Optional: the number of shade classes (`breaks.length + 1`). |
| `check({ counts, total, cuts })` | Throws if the data no longer supports the title. render-beat passes `counts`: `[under the low cut, the middle, from the high cut]`, `total` (the number of squares) and the cuts. |

The render refuses, saying what to change, when:
- a value lies outside 0–100 (it is not a share in %), or two units share a key;
- `cuts` is not two increasing whole percents that are multiples of 5;
- one of the three parts holds no unit (the argument does not hold for this data);
- there are so many units in one 5-point column that a square is too small to read (draw fewer);
- `percent` or `count` throws or does not return a string;
- a word runs into another or past the frame (shorten `axisName`, the count or percent words, or
  the source).

## Reading the data

Rows are arrays; find columns by name (neutral names here):

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const units = data.rows
  .filter((r) => Number(r[col("year")]) === 2024 && r[col("share")] !== null && r[col("share")] !== "")
  .map((r) => ({ key: r[col("code")], label: r[col("place")], value: Number(r[col("share")]) }));
```

If the share is not a column, compute it from its parts (`part / total * 100`).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision, never with strict equality on the raw division.
- When the title says "only N in the middle", `check()` compares `counts[1]` with N.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the three blocks closed together, the middle count ringed). If the render refuses, read
  its message and fix `beat.mjs`. If the picture is wrong (a wrong count, a word cut), fix `beat.mjs`
  with a small `edit_file`, render and look again.
