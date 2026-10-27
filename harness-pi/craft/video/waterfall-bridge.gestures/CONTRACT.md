# Waterfall (bridge) video, composed — what you write

The marks, the type, the colours and the layout are already done: the opening level as a column from zero, each
step floating on the running level (increases in the accent, decreases in the second ink), a dotted connector
carrying the level to the next column, and the closing level — the opening plus every step, computed — as the
last column, in the story's PALETTE.md and DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the
order the story tells it. Nothing is staged that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's video says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `opening` | `{ name, value }`: the level the bridge starts from (its column label, e.g. the first year). |
| `steps` | `[{ name, value }, …]`: each signed change, in story order. Compute each from the same columns the levels add up, so opening + steps = closing exactly. |
| `closing` | `{ name, value }`: the closing level's label and, optionally, its value from the data — the render refuses a bridge that does not add up. A gesture never names the closing column: `count` (with no mark) prints it. |
| `unit` | The unit printed over the columns ("TWh"). |
| `gestures` | The staging, in story order (below). |
| `decimals` | Optional. How many decimals the values print with (0 to 3); without it the language's rule applies. |
| `title` | The journalist's takeaway from STORYBOARD.md, copied word for word as a literal string: the title card. |
| `source` | The credit line, exactly as the storyboard records it (it closes the video). |
| `scope(shown, all)` | Optional. The sentence printed when the frame has room for only some rows (the rows your gestures act on are always kept). |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

```js
gestures: [
  { do: "bracket", marks: ["Wind", "Coal"], note: "-12 net" },
  { do: "name", mark: "Coal", note: "Coal: -40" },
  { do: "compare", marks: ["Coal", "Wind"], note: "-40 against +28" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | what the gesture acts on: a whole bar by its name (`"Alpha"`), one segment as `"<bar> · <part>"` (`"Alpha · Added"`, with the middle dot and a space each side), or a part by its name (`"Added"`: that part in every bar) |
| `marks` | several of those. For `compare`: the subject first, then what it is compared with (added up). For `bracket`: the segments or bars it spans |
| `of` | what a bracket or compare measures against: `"whole"` (inside one bar, that bar's total; across bars, every bar) or a list of marks |
| `value` | a number (a reference rule's level), or `"descending"` / `"ascending"` for reorder |
| `note` | the words drawn with the gesture, in the story's language |

On a bridge a mark is a step (or the opening) by its `name`. The steps keep their story order: `reorder` is refused, and a bracket of one step `of: "whole"` is refused (bracket a run of steps: it prints their net change).

A video takes EXACTLY THREE gestures, in story order: the first fills the `reveal` event, the second the
`subject`, the third the `conclusion`. The title card and the stack arriving on its one scale come before them and
are not yours to write; the conclusion shows the whole chart (a `filter` there is refused: make the third gesture
`pull-back`, `annotate` or `name`) and brings the credit; the video then holds on it. A gesture that changes nothing
in its event (a `pull-back` with nothing filtered before the conclusion, a `reorder` into the order already drawn) is
refused. A count or a bracket's figure climbs over its event; a compare's copy grows along the scale.

## Reading the data

Rows are arrays; find columns by name. Never type the rows or their numbers: `beat.mjs` must read `data.json`.

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
```

Leave out aggregate rows (a "Total", "World" or "EU" row is not a member).

```js
const opening = { name: "2015", value: sum(row(2015), ALL) };
const steps = [{ name: "Renewables", value: sum(row(2024), RENEWABLE) - sum(row(2015), RENEWABLE) }, …];
```

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a bar or part the takeaway names (or its comparison),
  or it states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is computed from the rows (a segment, a bar's total, a sum, a share, a difference, a
  ratio), written at the precision you choose. A number the rows do not give is refused. "twice", "highest",
  "lowest" in a note are checked against the rows (a bar's rank is its total's).
- Write every `note` in the storyboard's `language` — the same language as the title.
- A gesture that changes nothing and two notes on one bar are refused.
- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is
  the journalist's own sentence, copied as written.
- `check()` tests only what the drawn data can decide, at the takeaway's precision (`Math.round(v) === 143`).
- After `write_file`, call `render_beat` with format `video`, then `look` at the stills it lists. If the render refuses, read
  its message: a refusal on `gestures[i]` names the key to change and a value that works. If a still is wrong,
  fix `beat.mjs` with a small `edit_file`, render and look again.
