# Population pyramid (video) — what you write

The video is already designed: it comes from the worked example
`proof/video-population-pyramid-swiss-age` and the story's PALETTE.md and DIRECTION.md. The shots,
their timing (17.7 s at 30 fps), the type, the colours and the layout are done. The video opens on a
title card (eyebrow + title); then the pyramid: the halves' names over it, the band names in the
spine, the ticks under it, band after band from the foot each pair of bars growing out of the spine;
every LEFT bar slides, keeping its length, across the spine onto the right one, the part both share
turns neutral and leaves, and what is left — the difference — slides to the spine on the side of the
half that has it; the scale is magnified around the spine (« ×10 », the ticks change scale), a rule is
drawn at the CROSSING and the two differences either side of it are printed; then the camera returns,
the shared part grows back out of the spine — the whole pyramid, the rule kept — and the credit comes
in on one line. There is no standfirst and no sentence on screen. You do not change any of that.

The video argues ONE crossing: the left half ahead in every band below it, the right half in every band
from it. Use it when the takeaway is where two halves change places and the difference there is too
small to see at full scale.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) finds the
crossing, chooses the scale and the zoom, lays the frames out, renders thirteen stills, prints
`look at: <png>`, then renders the mp4 (about a minute).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `entity` | The population drawn ("Suisse", "Geneva canton"). |
| `bands` | One `{ band, left, right }` per age band (4 to 30), from `data.json`, YOUNGEST FIRST (the foot of the pyramid). `left` and `right` are the two groups' counts (or shares), never negative. |
| `leftName` | The name of the left half, drawn over it ("Men"). The left half is drawn in the accent, and it must be the half that LEADS AT THE FOOT. |
| `rightName` | The name of the right half ("Women"). |
| `crossing` | The first band where the two halves change places, COMPUTED from `bands`. The render refuses a band that is not the data's crossing. |
| `tickFormat(v)` | Optional. How an axis tick is printed; default `300000 → "300k"`. Returns a string. |
| `format(v)` | Optional. How a difference at the crossing is printed; default: thousands grouped ("5 136"). Returns a string. |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag. Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | Optional, 3. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- `crossing` is not the data's first band where the halves change places;
- the halves never change places, change back after the crossing, or tie in a band (this video names
  one crossing);
- the right half leads at the foot (swap left and right, and `leftName` / `rightName`);
- the largest difference is too large to need magnifying (offer the static format);
- `tickFormat` or `format` throws or does not return a string;
- a band name, a tick or a difference does not fit (shorten the words).

## Reading the data

Rows are arrays; find columns by name (neutral names here):

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const bands = data.rows
  .filter((r) => Number(r[col("year")]) === 2023)
  .map((r) => ({ band: r[col("age_group")], left: Number(r[col("group_a")]), right: Number(r[col("group_b")]) }));
const leads = (b) => Math.sign(b.right - b.left);
const flip = bands.findIndex((b, i) => i > 0 && leads(b) !== 0 && leads(b) !== leads(bands[0]));
const crossing = flip > 0 ? bands[flip].band : null;
```

Keep the bands in age order, youngest first. Filter to ONE year and ONE population first.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision, never with strict equality on the raw division.
- When the title names the band where the halves change places, `check()` compares the computed `crossing` with it.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole pyramid, the crossing ruled). If the render refuses, read its message and fix
  `beat.mjs`. If the picture is wrong (the rule in the wrong band, a word cut), fix `beat.mjs` with a
  small `edit_file`, render and look again.
