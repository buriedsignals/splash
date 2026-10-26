# Marimekko (video) — what you write

The video is already designed: it comes from the worked example `proof/video-marimekko-electricity-mix`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (20 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then the WHOLE
grows as one block, its total under it, and parts into the columns — each as wide as its total, the
names over them, the totals under their braces; column after column the bands grow up from the foot,
the band names arriving beside the last column; every band but the TRACKED one steps back while each
tracked cell drops out of its column and reshapes, area kept, into one strip under the plot — its
height is the tracked band's share of the whole, its largest holders named in their pieces, the share
(« 12,3 % ») at its end; then everything flies back, the named columns' tracked cells are ringed, and
the credit comes in on one line. There is no standfirst and no sentence on screen. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) adds every
column's bands, computes the whole, the tracked band's total, share and holders, lays the frames out,
renders eleven stills, prints `look at: <png>`, then renders the mp4 (about two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `columns` | One `{ key, label, values }` per column (2 to 8): `label` is the name printed over it, `values` an object giving EVERY band's value by band key (`0` where there is none), from `data.json`. Do not give totals: render-beat adds the bands. The columns are drawn largest first. |
| `bandOrder` | The bands bottom to top, 2 to 10: `[{ key, label }]`. `label` is printed beside the last column. The TRACKED band comes FIRST. |
| `tracked` | The `key` of the band the takeaway is about: it is the band that pours into the strip. |
| `named` | Optional: how many of the largest holders of the tracked band are named in the strip and ringed at the end (1 to 3, default 2). |
| `when` | The year or survey the mix is from, printed over the band names ("2024"). |
| `unit` | The unit of the values ("TWh"), printed after the whole's total. |
| `format(v)` | How a total is printed (each column's under its brace, the whole's), in the story's language. Returns a string. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag. Default: STORYBOARD.md's `language`. It sets the decimal separator of the strip's share. |
| `evidenceLevels` | Optional, 3. |
| `check({ columns, grand, trackedTotal, trackedShare, holders })` | Throws if the data no longer supports the title. render-beat passes the columns with their `total`, the whole (`grand`), the tracked band's total and share of the whole (0–1), and `holders`: `[{ key, label, value }]` of the tracked band per column, largest first. |

The render refuses, saying what to change, when:
- a column is too narrow to encode its width (put the smallest columns together in one column named
  for all of them, or leave them out);
- the tracked band is not first in `bandOrder`, or no column holds any of it;
- a column misses a band's value, or a value is negative or not a number;
- `format` throws or does not return a string;
- for this data two tracked pieces would collide while they pour (this video cannot tell it: the
  harness must offer the static format or another type);
- a name, a band name, a holder's name in its piece, the title or the credit does not fit the frame
  (shorten it, lower `named`, or draw fewer columns).

## Reading the data

Rows are arrays; find columns by name. When each band is a column of the table (neutral names):

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const bandOrder = [{ key: "type_a", label: "A" }, { key: "type_b", label: "B" }];
const columns = data.rows
  .filter((r) => Number(r[col("year")]) === 2024)
  .map((r) => ({ key: r[col("place")], label: r[col("place")], values: Object.fromEntries(bandOrder.map((b) => [b.key, Number(r[col(b.key)])])) }));
```

When the table is long (one row per place per band), build each column's `values` by reading the
rows of that place. Filter to ONE year (or one survey) first.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(trackedShare * 100) === 12`, or to one decimal), never with strict equality on the raw division.
- When the title says the tracked band "fits in N columns", `check()` adds the N largest `holders` and compares their share of `trackedTotal` with what the title implies (nearly all: 95 % or more), and `named` is N.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole marimekko, the holders ringed). If the render refuses, read its message and
  fix `beat.mjs`. If the picture is wrong (a name cut, the wrong band poured, a wrong total), fix
  `beat.mjs` with a small `edit_file`, render and look again.
