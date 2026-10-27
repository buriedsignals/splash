# Dumbbell (range plot), composed — what you write

The marks, the type, the colours and the layout are already done: one row per unit, its two readings (two moments) as two points on ONE fitted value axis, the link between them its change; rows are drawn in the order `rows` gives (rank them by the change). The change is printed at the row's end. The subject takes the story's accent;
every other row one neutral; a row a gesture names is ringed, never given a second colour. YOU decide the staging:
an ordered list `gestures`, in the order the story tells it. You write ONE file, `beat.mjs`, in the beat folder.
It reads `data.json` beside it and exports what THIS story says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | `{ name, from, to }` per unit: `from` and `to` are its readings at the two moments, read from `data.json`. `name` is the label printed for the row, exactly as gestures name it. |
| `moments` | The two moments each row is read at, as two strings, e.g. `["2000", "2023"]`. |
| `gestures` | The staging, in story order (below). |
| `unit` | What the axis measures, printed with the plot ("share of low-carbon electricity, %"). |
| `format(v)` | How a reading is printed (decimals, decimal comma or point for the language). |
| `domain` | Optional. A fixed scale `[lo, hi]` (`[0, 100]` for a share); without it the axis is fitted to the readings, never pulled to zero. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst, in forms, longest first: the measure, the moments, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(rows)` | A function returning the alt text for the rows drawn. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

A video takes exactly three gestures: the first fills the reveal, the second the subject, the third the conclusion — which shows the whole chart again, so it is never a `zoom` or a `filter` (write `pull-back`). The title card and the chart's arrival are the scheduler's.

```js
gestures: [
  { do: "highlight", mark: "Alpha" },
  { do: "compare", marks: ["Pologne", "États-Unis"], note: "+5,0 ans contre +2,5" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one row, written exactly as `rows` names it |
| `marks` | several rows. For `compare`: exactly two, the subject first. For `filter`/`highlight`: the rows kept or accented |
| `value` | a reference's level (a number on the axis), or `"descending"` / `"ascending"` for reorder |
| `note` | the words drawn with the gesture, in the story's language |

On this type a `compare`: a copy of the second row's change is laid from the subject's first point, under its own link. A row is compared with ONE other row — positions do not add up, so there
is no `bracket`, no `count`, no `of: "whole"`.

## Reading the data

Rows are arrays; find columns by name:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
```

Group the rows by unit and read what each unit needs (`{ name, from, to }` per unit: `from` and `to` are its readings at the two moments). A unit missing a reading is left out and the
plate says how many were — it is never refused. Leave out aggregate rows (a "World" or "Europe" row is not a unit).
Never type the rows or their numbers: `beat.mjs` must read `data.json`, or the render refuses it.

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a row the takeaway names (or its comparison), or it
  states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is one the gesture draws: a row's readings, its change (a row's change (`to − from`) is what the core
  ranks and compares rows by), the gap or ratio between two compared rows, the field's floor, ceiling, median or
  mean (on a `reference` or a `filter`), a count of the rows kept. A number the rows do not give is refused;
  "twice", "half", "highest", "lowest" are checked against the rows.
- A gap stated with "more"/"less"/"plus"/"moins" in a compare's note is the gap between the two rows' a row's change (`to − from`)s.
- One note per row; a gesture that changes nothing is refused.
- Write every `note` in the storyboard's `language`.
- `check()` tests only what the drawn data can decide, at the takeaway's precision (`Math.round(v) === 30`).
- After `write_file`, call `render_beat` with format `video`, then `look` at the result. A refusal on
  `gestures[i]` names the key to change and a value that works.
