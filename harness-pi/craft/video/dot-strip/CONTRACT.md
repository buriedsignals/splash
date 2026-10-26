# Dot strip (video) — what you write

The video is already designed: it comes from the worked example `proof/video-dot-strip-lowcarbon-spread`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (19 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then two
rails on ONE 0–100 scale, labelled with the two readings (`from`, `to`), every mark a chip with its
code pinned on the first rail; floor first, a copy of each chip travels to its seat on the second
rail, its leader drawn behind it; the others step back, and the floor's and the ceiling's rises are
written beside their leaders ("+29,5", "+2,1"); the first span traces from the floor to the
ceiling, a copy of it slides down onto the second rail pinned to the ceiling, keeping its length,
and the part past the floor's new pin turns grey with the closure written over it ("−27,4"); then
it folds away and the whole chart stands, the credit on one line. There is no standfirst and no
sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) finds the floor
and the ceiling, computes the two rises and the closure, lays the frames out (thinning the middle of
the field when the frame cannot hold every chip, and saying so in the credit through `scope()`),
renders eleven stills, prints `look at: <png>`, then renders the mp4 (one to two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `marks` | 8 to 24 marks, each `{ code, before, after }`: `code` is printed on its chip (1 to 4 characters, the ISO code), `before` and `after` are its two readings as PERCENTAGES from 0 to 100. One mark per code. |
| `subject` | The `code` of the FLOOR: the lowest mark at both readings. |
| `from`, `to` | The two readings' labels, beside the two rails ("2000", "2024"). |
| `scope(count, total)` | Said in the credit only when the frame draws `count` of the `total` marks (the floor, the ceiling and an even sample between): an array of forms, longest first ("12 des 16 pays : le plancher, le plafond et 10 entre eux"). |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `decimals` | Optional: decimals on the three figures (0 to 3). Default 1. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- the subject is not the lowest mark at both readings, or the highest mark is not the same at both
  (the spans run from the floor's chip to the ceiling's; another type is needed);
- the spread from the floor to the ceiling did not close, or the floor did not rise (the slid span
  would have no overhang);
- the three figures, as printed, do not add up (floor's rise − ceiling's rise = closure): raise `decimals`;
- a value is outside 0–100, a code is longer than 4 characters, or the field has fewer than 8 or more than 24 marks;
- a code, a label, the title or the credit does not fit the frame (shorten it).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const byCode = {};
for (const r of data.rows) (byCode[r[at("code")]] ??= {})[Number(r[at("year")])] = Number(r[at("share")]);
const marks = Object.entries(byCode).map(([code, v]) => ({ code, before: v[2000], after: v[2020] }));
const floor = marks.reduce((a, b) => (b.before < a.before ? b : a));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title states the floor's and the ceiling's rises, `check()` computes both from `marks` (the lowest and the highest `before`) and compares them at the title's precision.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- A word function (a field that is a function) must return a string for every value the render passes it; the render
  calls each one before drawing and names the one that throws.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: both strips whole, the two rises written). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, a wrong count, the wrong subject), fix `beat.mjs` with a small
  `edit_file`, render and look again.
