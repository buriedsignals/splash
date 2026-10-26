# Diverging bar (video) — what you write

The video is already designed: it comes from the worked example `proof/video-diverging-bar-eu-per-capita`
and the story's PALETTE.md and DIRECTION.md. The shots, their timing (20 s at 30 fps), the type,
the colours and the layout are done. The video opens on a title card (eyebrow + title); then every
row's FIRST reading grows from zero as a bar, row after row, under its label ("1990"); every bar
goes to its SECOND reading, the largest fall first, the part lost left pale, while a counter counts
the falls; the bars go and every part lost slides across a zero line, keeping its length, and
becomes the change; then the camera closes onto the zero line until the ONE row that rose — too
small to see on the whole scale — becomes a length (the factor, "×200", is printed); the camera
pulls back to the whole diverging chart, the rise ringed, the credit on one line. There is no
standfirst and no sentence on screen: names, changes, the counter and the unit. You do not change
any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
data and the WORDS of this story's video. `render-beat.mjs` (already in the folder) computes each
row's change, sorts them, counts the falls, lays the frames out (in one to four columns, and, when
the frame cannot hold every row, the rise and the largest falls with `scope()` said on the plate),
renders eleven stills, prints `look at: <png>`, then renders the mp4 (one to two minutes).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | Every member of the field as `{ name, from, to }`: its first and its second reading, from `data.json`. One row per name; readings 0 or more. |
| `subject` | The `name` of the ONE row whose `to` is above its `from`. |
| `fromLabel` | The first reading's label, shown while the first readings grow ("1990"). |
| `unit` | What the readings are counted in, printed over the chart ("tonnes de CO₂ par personne"). |
| `count(n, of)` | The counter's words for `n` falls landed ("26 baisses depuis 1990"). `of` is given only when the frame draws fewer rows than the field: it is the field's number of falls ("12 des 26 baisses depuis 1990"). Called for every `n` from 0. |
| `scope(drawn, all)` | Printed only when the frame draws `drawn` of the `all` rows: which ones, as an array of forms, longest first ("12 des 27 États membres : la hausse et les 11 plus fortes baisses"). |
| `source` | The credit line in one or two forms, longest first, exactly as the storyboard records it. It must fit on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `decimals` | Optional: decimals on every change (0 to 3). Default 2. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

The render refuses, saying what to change, when:
- more than one row rose, or none (this video argues ONE rise among falls; another type or format is needed);
- `subject` is not the row that rose;
- fewer than two rows fell, or fewer than four rows are given;
- the rise is already readable on the whole scale (the camera would have nothing to show: use the static or web format);
- a reading is negative (a level is a bar from zero);
- a name, the unit, the counter, the title or the credit does not fit the frame (shorten it).

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, YEAR, VALUE] = [col("region"), col("year"), col("amount")];
const at = (name, year) => data.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year)?.[VALUE];
const rows = [...new Set(data.rows.map((r) => r[NAME]))]
  .map((name) => ({ name, from: Number(at(name, 2000)), to: Number(at(name, 2020)) }))
  .filter((r) => Number.isFinite(r.from) && Number.isFinite(r.to));
const rose = rows.filter((r) => r.to > r.from);
```

Leave out aggregate rows (a "Total" or "World" row is not a member).

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- When the title says "the only one" that rose, `check()` counts the rows whose `to` is above `from` and throws unless it is exactly one, and that one is the subject.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- A word function (a field that is a function) must return a string for every value the render passes it; the render
  calls each one before drawing and names the one that throws.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole diverging chart, the rise ringed). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (a name cut, a wrong count, the wrong subject), fix `beat.mjs` with a small
  `edit_file`, render and look again.
