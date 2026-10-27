# Waterfall (bridge) (scrolly), composed — what you write

The marks, the type, the colours and the layout are already done: the opening level as a column from zero, each
step floating on the running level (increases in the accent, decreases in the second ink), a dotted connector
carrying the level to the next column, and the closing level — the opening plus every step, computed — as the
last column, in the story's PALETTE.md and DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the
order the story tells it. Nothing is staged that you do not write. You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the folder) checks the gestures and every card's words, draws the page, checks it in
a real browser and prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

The page is a scrolly: the graphic stays fixed while cards of prose travel up over it, and the reader's scroll
moves the picture continuously from one card's state to the next. Each gesture is ONE card: its picture is the
gesture, its prose is the gesture's `card`. After your last gesture comes a closing card the page adds itself: the
whole chart returns (what was filtered comes back, what your gestures marked stays marked) and the card reads your
`limits`. With JavaScript off the page shows that closing picture, every note written, and every card's words.

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
| `gestures` | The staging: one gesture per card, in story order (below). Each carries its `card`. |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string; shorter forms may follow. |
| `limits` | The closing card: what the figures count and leave out, the limits the journalist named (first form). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(drawn)` | A function returning the alt text for the bars actually drawn (or a string). |
| `scope(shown, all)` | Optional. The sentence printed when the frame has room for only some rows (the rows your gestures act on are always kept). |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

```js
gestures: [
  { do: "bracket", marks: ["Wind", "Coal"], note: "-12 net", card: "…" },
  { do: "name", mark: "Coal", note: "Coal: -40", card: "…" },
  { do: "compare", marks: ["Coal", "Wind"], note: "-40 against +28", card: "…" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | what the gesture acts on: a whole bar by its name (`"Alpha"`), one segment as `"<bar> · <part>"` (`"Alpha · Added"`, with the middle dot and a space each side), or a part by its name (`"Added"`: that part in every bar) |
| `marks` | several of those. For `compare`: the subject first, then what it is compared with (added up). For `bracket`: the segments or bars it spans |
| `of` | what a bracket or compare measures against: `"whole"` (inside one bar, that bar's total; across bars, every bar) or a list of marks |
| `value` | a number (a reference rule's level), or `"descending"` / `"ascending"` for reorder |
| `note` | the words written in the header while the gesture's card is read, in the story's language |
| `card` | the card's prose: the sentence (or an array of paragraphs) the reader reads while this gesture plays |

On a bridge a mark is a step (or the opening) by its `name`. The steps keep their story order: `reorder` is refused, and a bracket of one step `of: "whole"` is refused (bracket a run of steps: it prints their net change).

On the page a gesture plays as the reader scrolls into its card and stays drawn after it: a compare's copy grows
inside the subject's bar, a bracket draws itself and its sum climbs, a count's figure climbs in the header, a reveal
brings the parts in their locked order.

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

- Every gesture carries a `card`. A card states the figure its picture shows: a bar's total or one of its
  segments for a highlight, name or annotate; a bracket's sum (or its share); a compare's two lengths, gap or
  ratio; a reference's level; a count's final figure. A card's numbers are checked like a note's.

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
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names (card 1) and at
  the other cards' PNGs. If the render refuses, read
  its message: a refusal on `gestures[i]` names the key to change and a value that works. If the picture is wrong,
  fix `beat.mjs` with a small `edit_file`, render and look again.
