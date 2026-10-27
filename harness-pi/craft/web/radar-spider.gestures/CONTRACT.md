# Radar, composed — what you write

The marks, the type, the colours and the layout are already done: one polygon per entity on spokes in the beat's order, every spoke on ONE radial scale, in the story's PALETTE.md and
DIRECTION.md, drawn as an interactive page. YOU decide the staging: an ordered list `gestures`, in the order the story tells it.
Nothing is staged that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json`
beside it and exports what THIS story says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `axes` | The spokes' names, in the order drawn (clockwise from twelve). |
| `entities` | One `{ name, values: { <axis>: number } }` per entity. |
| `ceiling` | Optional: the radial scale's top. |
| `gestures` | The staging, in story order (below). |
| `format(v)` | How a value is printed (decimals, unit, decimal comma or point for the language). |
| `title` | The headline: its FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string. |
| `limits` | The standfirst, in forms, longest first: the first form carries the limits the journalist named. |
| `alt` | The alt text (a string, or a function of the drawn marks). |
| `restLabel` | The words of the option that shows the page as it lands, e.g. "The whole chart". |
| `source` | The credit line, exactly as the storyboard records it. |
| `check()` | Throws if the data no longer supports the title. |

## The marks a gesture names

A mark is ONE READING, named "entity · axis" (`"France · Nucléaire"`). An entity's name names its whole polygon; an axis's name every entity's reading on that spoke.

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

The resting gestures (`highlight`, `name`, `annotate`, `reference`, `reveal`, `pull-back`) are drawn on the page the reader lands on; every other gesture (`filter`, `compare`, `bracket`) becomes ONE reader control (two radios: the page as it lands, and the page with that gesture). A page needs at least one control.

```js
gestures: [
  { do: "highlight", mark: "France", note: "67,7 % de nucléaire" },
  { do: "compare", marks: ["Allemagne · Éolien", "France · Éolien"], note: "28,5 % contre 8,1 %" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one mark (or a group name, see above) |
| `marks` | several marks. For `compare`: the subject first, then the mark it is compared with |
| `of` | what a compare measures against: `"whole"` or a list of marks |
| `value` | a number: a reference rule's level |
| `note` | the words drawn with the gesture, in the story's language |

## Reading the data

Rows are arrays; find columns by name and build one entity per row with its value per axis (a share of its own total when the takeaway speaks of mixes).

- Never type the data or its numbers: `beat.mjs` must read `data.json`, or the render refuses it.

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a mark the takeaway names (or its comparison), or it
  states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is computed from the data (a value, a difference, a ratio, a reading's share of its entity's sum, how many entities a highlight holds), at the precision
  you choose. A number the data does not give is refused. "twice", "half", "highest", "lowest" are checked.
- Write every `note` in the storyboard's `language`, the same language as the title.
- A gesture that changes nothing and two notes on one mark are refused.
- The axis order is fixed (no reorder); one accent: highlighting a second entity rings it.
- After `write_file`, call `render_beat` with format `web`, then `look` at the screenshot; verify-web must pass. If the render refuses, read its message: a refusal on `gestures[i]` names the key to change and a value that
  works. Fix `beat.mjs` with a small `edit_file`, render and look again.
