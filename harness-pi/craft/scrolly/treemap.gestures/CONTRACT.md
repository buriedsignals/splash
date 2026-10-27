# treemap (part-to-whole), composed as a SCROLLY — what you write

The marks, the type, the colours and the layout are already done: one tile per part, its AREA its share of the whole, squarified from the largest, in the story's PALETTE.md and
DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the order the story tells it. Nothing is
staged that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it
and exports what THIS story's scrolly says: one card per gesture, the reader's scroll moving the picture from one gesture's state to the next, then a closing card carrying the limits. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, value }` per part, from `data.json` (aggregate rows left out). Values must not be negative: a tile has no negative area. |
| `gestures` | The staging, in story order (below). |
| `format(v)` | How a value is printed, with its unit (e.g. `(v) => v.toFixed(1) + " GW"`). |
| `unit` | What the parts measure, printed above the plot with the whole (e.g. "Installed capacity"). |
| `restLabel` | The words on the one part that holds what the frame has no room for, e.g. "other countries". |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The closing card's words (its first form), in forms, longest first: what the area or angle means, the whole, and the limits the journalist named, in their words. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(marks)` | A function returning the alt text. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

Each gesture is ONE card: its picture appears as the reader scrolls to it and stays marked on the cards that
follow (a `filter` is released by `pull-back` and on the closing card). The layout never moves between cards. Every
part a gesture names is drawn; the others largest first until the frame is full, the rest one part labelled with
`restLabel`.

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one part (or, below, a group of parts), written exactly as the marks name it |
| `marks` | several parts. For `compare`: the subject first, then the part (or parts, added up) it is compared with. For `bracket`: the parts it lays together |
| `of` | what a bracket or compare measures against: `"whole"` (every part) or a list of parts. A bracket with no `of` measures against the whole |
| `note` | optional: the short words the header shows while the card is read (else the figure its picture shows) |
| `card` | REQUIRED: the sentence (or a list of paragraphs) the reader reads on this gesture's card, in the story's language. It must state the figure its picture shows (a part's value or share, a bracket's sum or share, a compare's other value or ratio, a count's end), and every number in it is checked |

A mark is a row's `name`.

```js
gestures: [
  { do: "highlight", mark: "Alpha", card: "Alpha, in colour: 31 of the 50." },
  { do: "bracket", marks: ["Alpha", "Beta"], of: "whole", note: "62 % of the total", card: "With Beta, 62 % of the total." },
  { do: "compare", marks: ["Alpha", "Gamma"], card: "Alpha is three times Gamma's 10." },
]
```

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

- Never type the rows or their numbers: `beat.mjs` must read `data.json`, or the render refuses it.

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a part the takeaway names, or states one of its figures.
- Every number in a `note` is computed from the rows: a value, a sum, a share of the whole (or of a column), a
  difference, a ratio, written at the precision you choose. A share is a percent of the drawn whole. A number the
  rows do not give is refused; "twice", "half", "largest" in a note are checked against the rows.
- A share of several parts together is written on a `bracket` of those parts (`of: "whole"`), never on a
  highlight, a filter or a count.
- A treemap's accent marks a thread, never the largest tile (the area already says it is largest): `highlight` on the largest part is refused; `name` rings it instead.
- Write every `note` in the storyboard's `language`.
- `check()` tests only what the drawn data can decide, at the takeaway's precision (`Math.round(v) === 14`).
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the card screenshots. If the render refuses, read
  its message: a refusal on `gestures[i]` names the key to change and a value that works.
