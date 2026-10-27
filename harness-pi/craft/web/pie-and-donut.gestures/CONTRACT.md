# pie-and-donut (part-to-whole), composed for the web — what you write

The marks, the type, the colours and the layout are already done: one ring is the whole; each part an arc from twelve o'clock, clockwise, its ANGLE its share, in the story's PALETTE.md and
DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the order the story tells it. Nothing is
staged that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it
and exports what THIS story's page says. `render-beat.mjs` (already in the folder) draws it as an interactive page,
verifies it in Chrome and prints `look at:`.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ name, value }` per part, from `data.json` — EVERY part of the whole, not only the ones the story names (the ring is 100 % of the rows). Values must not be negative. |
| `gestures` | The staging, in story order (below). |
| `format(v)` | How a value is printed, with its unit (e.g. `(v) => v.toFixed(1) + " GW"`). |
| `unit` | What the parts measure, printed above the plot with the whole (e.g. "Installed capacity"). |
| `restLabel` | The words on the one part that holds what the frame has no room for, e.g. "other countries". |
| `landingLabel` | The words of the option that shows the page as it lands (each control's first radio), e.g. "The whole". |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst, in forms, longest first: what the area or angle means, the whole, and the limits the journalist named, in their words. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(marks)` | A function returning the alt text. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

ON THE PAGE, two kinds of gesture. `highlight`, `name`, `annotate`, `count`, `reveal` and `pull-back` REST: they
are drawn on the page the reader lands on, all at once. `bracket`, `compare` and `filter` are each ONE READER
CONTROL: two radios, the page as it lands (`landingLabel`) and the page with that gesture applied. A page needs at
least one control, or it is refused (it would hold no reading a still lacks). A `bracket` gathers its parts and
prints their sum and share; a `compare` lays a copy of the compared quantity against the subject; a `filter` steps
the other parts back. Every part also answers a pointer, a tap or a key with its share of the whole and its rank.
Every part a gesture names is drawn; the others are drawn largest first until the frame is full, and the rest become
one part labelled with `restLabel`. A `label` on a control gesture (optional) replaces the words of its second radio.

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one part (or, below, a group of parts), written exactly as the marks name it |
| `marks` | several parts. For `compare`: the subject first, then the part (or parts, added up) it is compared with. For `bracket`: the parts it lays together |
| `of` | what a bracket or compare measures against: `"whole"` (every part) or a list of parts. A bracket with no `of` measures against the whole |
| `note` | the words drawn with the gesture, in the story's language |

A mark is a row's `name`.

```js
gestures: [
  { do: "highlight", mark: "Alpha" },                                                  // rests on the page
  { do: "bracket", marks: ["Alpha", "Beta"], of: "whole", note: "62 % of the total" }, // a control
  { do: "compare", marks: ["Alpha", "Gamma"], note: "three times Gamma" },             // a control
]
```

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [NAME, VALUE] = [col("region"), col("amount")];
const rows = data.rows
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
- At least one `bracket`, `compare` or `filter`: the controls are what the page adds to a still.
- The ring is the sum of `rows`: leave out aggregate rows (a "World" or "Total" row is the whole, not a part).
- Write every `note` in the storyboard's `language`.
- `check()` tests only what the drawn data can decide, at the takeaway's precision (`Math.round(v) === 14`).
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG (the page as it lands). If the render refuses, read
  its message: a refusal on `gestures[i]` names the key to change and a value that works.
