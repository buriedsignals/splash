# Pictogram (isotype), composed — what you write

The marks, the type, the colours and the layout are already done: one square per real THING (a country, a school), never a slice of a quantity; the squares gathered in BLOCKS by value range, one square size for every block, each block's count printed after it, in the story's PALETTE.md and
DIRECTION.md. The groups are COUNTED by render-beat.mjs from the readings and the partition you give; it never
refuses the data's shape (a first edge above the smallest reading moves down, an open tail holding a quarter of the
readings gains bins, a reading no block holds is counted in a stated "other" group, and it says so). YOU decide the
staging: an ordered list `gestures`, in the order the story tells it. The plate draws every gesture at once; a gesture that moves (`reveal`, `count`, `pull-back`) is drawn as it ends.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's
chart says. `beat.example.mjs` (in the folder) is a worked example: read it first, then write this story's from
scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `units` | One `{ name, value }` per counted thing (a country, a school…), from `data.json`. Leave out aggregate rows and things with no reading. |
| `blocks` | The groups, top to bottom: `[{ key, name, min, max }]`. A thing goes in the first block where `min <= value < max` (leave `min` or `max` out for an open end). `name` is printed beside the block ("above 75 %"); `key` is a short id ("top"). |
| `unitIs` | Optional: the key's line saying what one square is ("one square = one country"). |
| `unit` | What the readings measure and what a group counts, printed once beside the chart ("tonnes of CO₂ per person, 2023"). |
| `gestures` | The staging, in story order (below). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). Shorter forms may follow in a list. |
| `limits` | The standfirst, in forms, longest first: what one thing is, the year, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text: a string, or a function of `{ groups, counts, total }`. |
| `check({ groups, counts, total })` | Throws if the data no longer supports the title. `counts` gives each group's count by its key (`counts["0-4"]`, `counts.middle`); `total` is the number of things. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

A gesture names a BLOCK by its `key` (`"middle"`) or its `name`. A `reference` is a rule at a block
BOUNDARY (`value: 60`, where one block's `max` is the next one's `min`).

```js
gestures: [
  { do: "highlight", mark: "middle" },
  { do: "reference", value: 60, note: "…" },
  { do: "bracket", mark: "middle", of: "whole", note: "…" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one group, as the chart names it |
| `marks` | several groups. For `compare`: the subject first, then the group (or groups, added up) it is compared with. For `bracket`: groups that sit together |
| `of` | what a bracket or compare measures against: `"whole"` (every thing counted) or a list of groups |
| `value` | a `reference`'s edge |
| `note` | the words drawn with the gesture, in the story's language |

## Reading the data

Rows are arrays; find columns by name, never by position:

```js
const col = (name) => data.columns.findIndex((c) => c.name === name);
const units = data.rows
  .filter((r) => r[col("value")] !== null && r[col("value")] !== "")   // a thing with no reading is not drawn
  .map((r) => ({ name: r[col("place")], value: Number(r[col("value")]) }));
```

Filter to ONE year (or survey) first, so each thing is counted once.

## Rules

- A group's value is a COUNT of things. Every number in a `note` is computed from the counts (a count, a sum, a
  share of the whole, a difference, a ratio) or is one of the edges of the groups the gesture acts on ("under 4
  tonnes", "above 75 %"). A number the counts do not give is refused, and so is a count that states the number of
  groups instead of the things in them. "twice", "half", "most", "fewest" are checked against the counts.
- Every gesture serves the confirmed takeaway: it acts on a group the takeaway names, or states one of its figures.
- A `reference` sits on an edge of the groups: a rule between edges would re-bin the readings, and is refused with
  the nearest edge.
- Two notes on one group and a gesture that changes nothing are refused.
- Every number in a sentence is computed from `data.json`, never typed — except the title's first form.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- `check()` compares a computed value with the takeaway's figure at the takeaway's precision
  (`Math.round(counts["0-4"] / total * 10) === 6`), never a count you typed elsewhere.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. A refusal on `gestures[i]` names the key to change and a value that works; fix `beat.mjs` with a
  small `edit_file`, render and look again.
