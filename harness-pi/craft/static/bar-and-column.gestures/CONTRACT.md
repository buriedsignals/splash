# Bar and column, composed — what you write

The marks, the type, the colours and the layout are already done: one bar per row, on one scale from zero,
in the story's PALETTE.md and DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the order
the story tells it. Nothing is staged that you do not write. You write ONE file, `beat.mjs`, in the beat
folder. It reads `data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already
in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch
with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, value }` per bar, from `data.json`, sorted from the largest. `name` is the label printed under the bar. |
| `gestures` | The staging, in story order (below). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: unit, scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(drawn)` | A function returning the alt text for the bars actually drawn. |
| `scope(shown, all)` | Optional. The sentence the plate prints when the frame has room for only some rows (the rows your gestures act on are always kept), in the story's language, e.g. `(shown, all) => \`The ${shown} largest of ${all}\``. Without it the plate prints "6 / 10". |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
| `highlight` | one row takes the accent colour; the others stay neutral |
| `name` | one row is ringed and labelled with its value |
| `annotate` | a short note written directly beside one row |
| `bracket` | a bracket spans a run of rows (or one row against the whole) and prints their sum or share |
| `compare` | two rows set side by side: a copy of the second's length laid against the first, the note states the gap or ratio |
| `reference` | a rule at a stated value, named in its note |
| `filter` | the rows the claim is about keep their ink; the others step back, nothing moves |
| `reorder` | the same rows move into the order that answers the question |
| `rescale` | the value axis travels to a new top, the marks glide with it — never between two shots being compared |
| `count` | a figure climbs as the rows it counts appear; the note states where it ends |
| `reveal` | marks appear one by one in their natural order (rank or time) |
| `pull-back` | the frame returns to the whole chart, with what was shown still marked |

On this still plate every gesture is drawn at once; a gesture that moves (`reveal`, `count`, `rescale`,
`pull-back`) is drawn as it ends.

```js
gestures: [
  { do: "highlight", mark: "Alpha" },
  { do: "bracket", mark: "Alpha", of: "whole", note: "60 of 100" },
  { do: "compare", marks: ["Alpha", "Beta"], note: "three times Beta's 20" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one row, written exactly as `rows` names it |
| `marks` | several rows. For `compare`: the subject first, then the row (or rows, added up) it is compared with. For `bracket`: rows that sit together |
| `of` | what a bracket or compare measures against: `"whole"` (the total of every row) or a list of rows |
| `value` | a number (a reference line's level, a rescale's new top), or `"descending"` / `"ascending"` for reorder |
| `note` | the words drawn with the gesture, in the story's language |

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

- Never type the rows or their numbers: `beat.mjs` must read `data.json`, or the render refuses it.

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a row the takeaway names (or its comparison), or it
  states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is computed from the rows (a value, a sum, a share, a difference, a ratio), written
  at the precision you choose. A number the rows do not give is refused. "twice", "three times", "half",
  "highest", "lowest" in a note are checked against the rows.
- Write every `note` in the storyboard's `language` — the same language as the title — whatever language the
  data's column names are in.
- A gesture that changes nothing (the same highlight twice) and two notes on one row are refused.
- Choose the gestures that make the takeaway visible on the plate: every number the takeaway states should be
  drawn by one of them.
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values),
  with that base said in the unit or the standfirst — never as 0.0039.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per
  capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- `check()` tests only what the drawn data can decide, comparing a computed value with the takeaway's figure at
  the takeaway's precision (`Math.round(v) === 233`), never with strict equality on a raw division.
- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is
  the journalist's own sentence, copied as written.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render refuses, read
  its message: a refusal on `gestures[i]` names the key to change and a value that works. If the picture is wrong,
  fix `beat.mjs` with a small `edit_file`, render and look again.
