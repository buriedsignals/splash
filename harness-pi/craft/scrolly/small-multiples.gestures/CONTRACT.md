# Small multiples, composed — what you write

The marks, the type, the colours and the layout are already done: one panel per entity, every panel the same bars on ONE shared value scale from zero, values printed on the bars, in the story's PALETTE.md and
DIRECTION.md, drawn as a scrolly page. YOU decide the staging: an ordered list `gestures`, in the order the story tells it.
Nothing is staged that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json`
beside it and exports what THIS story says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `panels` | One `{ name, bars: [{ name, value }] }` per panel (e.g. a country, its 2000 and 2024 bars), from `data.json`, in the order to draw them. |
| `ceiling` | Optional: the shared scale's top (e.g. 100 for shares). |
| `gestures` | The staging, in story order (below). |
| `format(v)` | How a value is printed (decimals, unit, decimal comma or point for the language). |
| `title` | The headline: its FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string. |
| `limits` | The closing card's words, in forms, longest first: the first form carries the limits the journalist named. |
| `alt` | The alt text (a string, or a function of the drawn marks). |
| `source` | The credit line, exactly as the storyboard records it. |
| `check()` | Throws if the data no longer supports the title. |

## The marks a gesture names

A mark is ONE BAR, named "panel · bar" (`"Danemark · 2024"`). A panel's name names its bars (the whole panel); a bar's name (`"2024"`) names that bar in every panel.

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

One card per gesture, the scroll interpolating from one card's picture to the next, then a closing card carrying the limits. EVERY gesture carries `card`: the sentence the reader reads while it plays, in the story's language, stating the figure its picture shows (a highlight or filter: a value of its marks; a compare: one of the two values).

```js
gestures: [
  { do: "highlight", mark: "Danemark", note: "+74 points" },
  { do: "compare", marks: ["Danemark · 2024", "Danemark · 2000"], note: "+74 points" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one mark (or a group name, see above) |
| `marks` | several marks. For `compare`: the subject first, then the mark it is compared with |
| `of` | what a compare measures against: `"whole"` or a list of marks |
| `value` | a number: a reference rule's level on the shared scale (a rule across every panel) |
| `note` | the words drawn with the gesture, in the story's language |
| `card` | the card's prose (scrolly): a string, or several paragraphs |

## Reading the data

Rows are arrays; find columns by name, compute the measure the takeaway is about (a share, a rate), one panel per entity.

- Never type the data or its numbers: `beat.mjs` must read `data.json`, or the render refuses it.

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a mark the takeaway names (or its comparison), or it
  states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is computed from the data (a value, a difference, a ratio, a panel's change from its first bar to its last, how many panels a highlight holds), at the precision
  you choose. A number the data does not give is refused. "twice", "half", "highest", "lowest" are checked.
- Write every `note` in the storyboard's `language`, the same language as the title.
- A gesture that changes nothing and two notes on one mark are refused.
- Bars of different panels do not add up to a whole: `bracket` and `count` are not offered.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the card screenshots; verify-scrolly must pass. If the render refuses, read its message: a refusal on `gestures[i]` names the key to change and a value that
  works. Fix `beat.mjs` with a small `edit_file`, render and look again.
