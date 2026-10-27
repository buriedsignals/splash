# Gantt, composed — what you write

The marks, the type, the colours and the layout are already done: one row per entity, its runs as bars on one shared time axis (whole years), names in a gutter, year ticks under the rows, in the story's PALETTE.md and
DIRECTION.md, drawn as a still plate. YOU decide the staging: an ordered list `gestures`, in the order the story tells it.
Nothing is staged that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json`
beside it and exports what THIS story says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, runs: [{ from, to, open }] }` per row, from `data.json`, in the order to draw them. `from`/`to` are whole years; `open: true` when the run is still running at `last`. A row may hold several runs (a gap between them is drawn). |
| `first`, `last` | The axis's first and last whole years. |
| `gestures` | The staging, in story order (below). |
| `format(v)` | How a value is printed (decimals, unit, decimal comma or point for the language). |
| `title` | The headline: its FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string. |
| `limits` | The standfirst, in forms, longest first: the first form carries the limits the journalist named. |
| `alt` | The alt text (a string, or a function of the drawn marks). |
| `source` | The credit line, exactly as the storyboard records it. |
| `check()` | Throws if the data no longer supports the title. |

## The marks a gesture names

A mark is a ROW, named as `rows` names it; its value is the number of whole years its runs cover. `marks` may list several rows ("the six that never left").

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

On this still plate every gesture is drawn at once; a gesture that moves (`reveal`, `pull-back`) is drawn as it ends.

```js
gestures: [
  { do: "highlight", marks: ["China", "India"], note: "2 countries present all 35 years" },
  { do: "compare", marks: ["China", "Kuwait"], note: "35 years against 1" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one mark (or a group name, see above) |
| `marks` | several marks. For `compare`: the subject first, then the mark it is compared with |
| `of` | what a compare measures against: `"whole"` or a list of marks |
| `value` | a number: a reference rule's level — on a gantt, a YEAR on the axis |
| `note` | the words drawn with the gesture, in the story's language |

## Reading the data

Rows are arrays; find columns by name and build the runs from the years each entity holds:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
// e.g. for each entity, the years it qualifies; consecutive years make one run.
```

- Never type the data or its numbers: `beat.mjs` must read `data.json`, or the render refuses it.

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a mark the takeaway names (or its comparison), or it
  states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is computed from the data (a value, a difference, a ratio, a run's length, how many rows a highlight or filter holds), at the precision
  you choose. A number the data does not give is refused. "twice", "half", "highest", "lowest" are checked.
- Write every `note` in the storyboard's `language`, the same language as the title.
- A gesture that changes nothing and two notes on one mark are refused.
- Durations of different rows do not add up to a whole: `bracket` and `count` are not offered; compare two rows instead.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. If the render refuses, read its message: a refusal on `gestures[i]` names the key to change and a value that
  works. Fix `beat.mjs` with a small `edit_file`, render and look again.
