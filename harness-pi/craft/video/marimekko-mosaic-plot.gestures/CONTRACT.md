# marimekko-mosaic-plot (part-to-whole), composed as a VIDEO — what you write

The marks, the type, the colours and the layout are already done: one column per group, its WIDTH the group's total; inside it one band per segment, its height the segment's share of the column — so a cell's AREA is its value, in the story's PALETTE.md and
DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the order the story tells it. Nothing is
staged that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it
and exports what THIS story's video says: a title card, the parts arriving, your three gestures one after the other, the whole at the end, the credit. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ column, segment, value }` per cell, from `data.json`, columns in the order they are drawn (largest first is usual). Segments stack in the order they first appear. Values must not be negative. |
| `gestures` | The staging, in story order (below). |
| `format(v)` | How a value is printed, with its unit (e.g. `(v) => v.toFixed(1) + " GW"`). |
| `unit` | What the parts measure, printed above the plot with the whole (e.g. "Installed capacity"). |
| `restLabel` | The words on the one part that holds what the frame has no room for, e.g. "other countries". |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst, in forms, longest first: what the area or angle means, the whole, and the limits the journalist named, in their words. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(marks)` | A function returning the alt text. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

A video takes EXACTLY THREE gestures, in story order: the first plays in the `reveal` event, the second in
`subject`, the third in `conclusion`. The conclusion shows the whole: a `filter` there is refused (use `pull-back`),
and a filter earlier is released there. The layout never moves: a `bracket`'s outline draws in, a `compare`'s copy
grows at the plate's own area (or angle) per unit, a `count`'s figure climbs; each gesture's `note` (else the figure
its picture shows) is written on a caption line above the plot while it plays. Every part a gesture names is drawn;
the others largest first until the frame is full, the rest one part labelled with `restLabel`.

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one part (or, below, a group of parts), written exactly as the marks name it |
| `marks` | several parts. For `compare`: the subject first, then the part (or parts, added up) it is compared with. For `bracket`: the parts it lays together |
| `of` | what a bracket or compare measures against: `"whole"` (every part) or a list of parts. A bracket with no `of` measures against the whole |
| `note` | the words drawn with the gesture, in the story's language |

A mark is a cell, written `"<column> · <segment>"` (e.g. `"Germany · Coal"`). A column's name (`"Germany"`) or a segment's (`"Coal"`) names all its cells at once.

```js
gestures: [
  { do: "highlight", mark: "Alpha" },
  { do: "bracket", marks: ["Alpha", "Beta"], of: "whole", note: "62 % of the total" },
  { do: "compare", marks: ["Alpha", "Gamma"], note: "three times Gamma" },
]
```

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE] = [col("region"), col("amount")];
const rows = data.rows.map((r) => ({ column: r[GROUP], segment: r[PART], value: Number(r[VALUE]) }));
```

- Never type the rows or their numbers: `beat.mjs` must read `data.json`, or the render refuses it.

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a part the takeaway names, or states one of its figures.
- Every number in a `note` is computed from the rows: a value, a sum, a share of the whole (or of a column), a
  difference, a ratio, written at the precision you choose. A share is a percent of the drawn whole. A number the
  rows do not give is refused; "twice", "half", "largest" in a note are checked against the rows.
- A share of several parts together is written on a `bracket` of those parts (`of: "whole"`), never on a
  highlight, a filter or a count.
- Exactly three gestures; the third never hides part of the whole.
- Column and segment order are the data's: there is no reorder.
- Write every `note` in the storyboard's `language`.
- `check()` tests only what the drawn data can decide, at the takeaway's precision (`Math.round(v) === 14`).
- After `write_file`, call `render_beat` with format `video`, then `look` at the stills it prints. If the render refuses, read
  its message: a refusal on `gestures[i]` names the key to change and a value that works.
