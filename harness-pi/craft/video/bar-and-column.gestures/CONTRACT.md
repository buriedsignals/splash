# Bar and column (video), composed — what you write

The marks, the type, the colours, the layout and the timing (21 s at 30 fps) are already done: one bar per
row, on one scale from zero, in the story's PALETTE.md and DIRECTION.md. The video opens on a title card
(the eyebrow and the takeaway); then the chart arrives on its scale — the names, the zero rule, the bars
growing. YOU decide what happens next: an ordered list `gestures` of exactly THREE gestures, in the order
the story tells it. The first plays as the reveal, the second as the subject, the third as the conclusion.
The conclusion shows the whole chart: whatever was zoomed or filtered returns, what your gestures marked
stays marked, and the credit comes up. Then the last picture holds. There is no standfirst on screen:
names, counts and your notes only.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the data and
the WORDS of this story's video. `render-beat.mjs` (already in the folder) checks the gestures, lays out the
frames, renders ten stills, prints `look at: <png>`, then renders the mp4 (about a minute).

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch
with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). The title card draws it whole. |
| `rows` | Every row as `{ name, value }`, from `data.json`, sorted from the largest. One row per name. Values may be zero or negative. |
| `gestures` | The staging: exactly three gestures, in story order (below). |
| `unit` | The unit every count carries, short ("Gt", "million", "km"); `""` for none. |
| `source` | The credit line, exactly as the storyboard records it. |
| `scope(shown, all)` | Optional. The sentence printed under the bars when the frame has room for only some rows (the rows your gestures act on are always drawn), in the story's language, e.g. `(shown, all) => \`The ${shown} largest of ${all}\``. Without it the frame prints "12 / 40". |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. It sets the decimal separator. |
| `decimals` | Optional: decimals on every count (0 to 3). Default: one from 1 and two under 1 while the largest value is under 100, none past it. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the viewer sees |
|---|---|
| `highlight` | one row takes the accent colour; the others stay neutral |
| `name` | one row is ringed and labelled with its value |
| `annotate` | a short note written directly beside one row |
| `bracket` | a bracket spans a run of rows (or one row against the whole) and prints their sum or share |
| `compare` | two rows set side by side: a copy of the second's length laid against the first, the note states the gap or ratio |
| `reference` | a rule at a stated value, named in its note |
| `filter` | the rows the claim is about keep their ink; the others step back, nothing moves |
| `zoom` | the value scale enlarges onto a few rows to show what the overview cannot; the factor is printed |
| `reorder` | the same rows move into the order that answers the question |
| `rescale` | the value axis travels to a new top, the marks glide with it — never between two shots being compared |
| `count` | a figure climbs as the rows it counts appear; the note states where it ends |
| `reveal` | marks appear one by one in their natural order (rank or time) |
| `pull-back` | the frame returns to the whole chart, with what was shown still marked |

In a video, a bracket's figure climbs as it runs down its rows, then its note replaces the figure; a count's
figure climbs the same way on a line above the bars. A `zoom` or a `filter` cannot be the third gesture: the
conclusion shows the whole chart (make the third one `pull-back`, or any other gesture).

```js
gestures: [
  { do: "highlight", mark: "Alpha" },
  { do: "compare", marks: ["Alpha", "Beta"], note: "three times Beta's 20" },
  { do: "bracket", mark: "Alpha", of: "whole", note: "60 of 100" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one row, written exactly as `rows` names it |
| `marks` | several rows. For `compare`: the subject first, then the row (or rows, added up) it is compared with. For `bracket`: the rows it adds up |
| `of` | what a bracket or compare measures against: `"whole"` (the total of every row) or a list of rows |
| `value` | a number (a reference line's level, a rescale's new top), or `"descending"` / `"ascending"` for reorder |
| `note` | the words drawn with the gesture, in the story's language. A zoom's note prints its factor ("×4") |

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE] = [col("region"), col("amount")];
const rows = data.rows
  .filter((r) => r[NAME] !== "Total")
  .map((r) => ({ name: r[NAME], value: Number(r[VALUE]) }))
  .sort((a, b) => b.value - a.value);
```

Leave out aggregate rows (a "Total" or "World" row is not a member). Large raw values may be rescaled
(tonnes → billions of tonnes) when the unit says so.

## Rules

- A video takes exactly three gestures. The render refuses two (it says how many to add) and four (it names
  the one to drop).
- Every gesture must serve the confirmed takeaway: it acts on a row the takeaway names (or its comparison), or it
  states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is computed from the rows (a value, a sum, a share, a difference, a ratio), written
  at the precision you choose. A number the rows do not give is refused. "twice", "three times", "half",
  "highest", "lowest" in a note are checked against the rows. A zoom's factor is checked against the zoom.
- A gesture that changes nothing (the same highlight twice, a reorder into the order the rows already have,
  a pull-back with nothing to return from before the conclusion) and two notes on one row are refused.
- Write every `note` in the storyboard's `language` — the same language as the title — whatever language the
  data's column names are in.
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values),
  with that base said in the unit — never as 0.0039.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per
  capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- `check()` tests only what the drawn data can decide, comparing a computed value with the takeaway's figure at
  the takeaway's precision (`Math.round(v) === 233`), never with strict equality on a raw division.
- Every number in a sentence is computed from `data.json`, never typed — except the title, which is the
  journalist's own sentence, copied as written.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the last frame:
  the whole chart). If the render refuses, read its message: a refusal on `gestures[i]` names the key to change
  and a value that works. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
