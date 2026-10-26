# Radar / spider (video) — what you write

The video is already designed: it comes from the worked example `proof/video-radar-electricity-mix`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (18.5 s at 30 fps), the type, the
colours and the layout are done. The video opens on a title card (eyebrow + title); then the two
items' WHOLES as two bars on one scale, each name before its bar and its total after; the other item's
bar stretches to the subject's length — each becomes its own whole, « 100 % » — and gaps cut both bars
into their spokes' parts; the camera pulls back as the wheel arrives (rings, spokes, the ceiling) and
the names travel to the key; spoke after spoke, both parts swing onto their spoke keeping their length
on the wheel's one scale, the two outlines joining tip to tip, each spoke's name and two shares
arriving at its end; then both outlines close and fill, the NAMED spoke's two shares are ringed, and
the credit comes in on one line. There is no standfirst and no sentence on screen. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes each
item's whole and every spoke's share of it, the wheel's ceiling, lays the frames out, renders ten
stills, prints `look at: <png>`, then renders the mp4 (about a minute).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `items` | The two item names as printed, e.g. `["Item A", "Item B"]`, in the order of every spoke's `values`. |
| `subject` | The item the takeaway is about, spelled exactly as in `items`. It is drawn in the accent, and it must hold the LARGER whole (the other's bar stretches to it). |
| `spokes` | One `{ key, label, shortLabel?, values }` per spoke (3 to 12), clockwise from twelve o'clock, spokes of one family adjacent. `values` = the two items' ABSOLUTE values (TWh, euros, people), in the order of `items`; render-beat adds them into each item's whole and computes the shares. `shortLabel` is used only where the full label leaves no wheel. |
| `named` | The `key` of the spoke the takeaway turns on: its two shares are ringed at the end. |
| `format(v)` | How a share is printed at a spoke's end, without the `%` sign, in the story's language. Returns a string. |
| `formatTotal(v)` | How an item's whole is printed after its bar, unit included ("561,8 TWh"). Returns a string. |
| `percent(v)` | Optional: how « 100 % » and the wheel's ceiling are printed (default `100 %` in French, `100%` otherwise). |
| `source` | The credit line in one to three forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag. Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | Optional, 3. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- `items` is not two names, `subject` is not one of them, or `named` is not a spoke's key;
- a spoke's `values` is not the two items' values, or a value is negative;
- the subject holds the smaller whole (this video stretches the other's bar to the subject's: offer the
  static format);
- `format`, `formatTotal` or `percent` throws or does not return a string;
- no wheel radius seats every spoke's words inside the frame (shorten the labels or give them a
  `shortLabel`, shorten the item names or the source).

## Reading the data

Rows are arrays; find columns by name (neutral names here):

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const rowOf = (place) => data.rows.find((r) => r[col("place")] === place && Number(r[col("year")]) === 2024);
const spokes = [
  { key: "part_a", label: "A" },
  { key: "part_b", label: "B" },
].map((s) => ({ ...s, values: ["Place 1", "Place 2"].map((p) => Number(rowOf(p)[col(s.key)])) }));
```

When the table is long (one row per place per part), read each part's value for each place. Filter to
ONE year first.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision, never with strict equality on the raw division.
- In `check()`, compute each share as the spoke's value over the sum of that item's spoke values, × 100 — the same share the wheel draws.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the radar, the named spoke ringed). If the render refuses, read its message and fix
  `beat.mjs`. If the picture is wrong (the wrong spoke ringed, a share wrong, a word cut), fix
  `beat.mjs` with a small `edit_file`, render and look again.
