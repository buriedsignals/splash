# Waterfall (bridge) (web), composed — what you write

The marks, the type, the colours and the layout are already done: the opening level as a column from zero, each
step floating on the running level (increases in the accent, decreases in the second ink), a dotted connector
carrying the level to the next column, and the closing level — the opening plus every step, computed — as the
last column, in the story's PALETTE.md and DIRECTION.md. YOU decide the staging: an ordered list `gestures`, in the
order the story tells it. Nothing is staged that you do not write.

The page splits your gestures in two:

- **Resting gestures** — `highlight`, `name`, `annotate`, `reference`, `count`, `reveal`, `pull-back` — are drawn on
  the page the reader lands on, all at once, as a still plate draws them. Their notes are written under the title.
- **Every other gesture** — `bracket`, `compare`, `filter`, `reorder` — becomes ONE control the reader turns on: two
  pills, the page as it lands (`restLabel`) and the page with that gesture applied. Its `note` is the sentence printed
  under the controls while it is on. A page needs at least one of these.

Every segment answers a hover, a tap or the keyboard with its value, its share of its bar and its bar's total. With
JavaScript off the page is the resting picture with every note written, and every control still works.

You write ONE file, `beat.mjs`, in the beat folder. It reads
`data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in the folder) checks it, draws the page, checks it in a real browser and prints
`look at: <png>`.

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
| `restLabel` | The words of the pill that shows the page as it lands, e.g. "Le mix seul". Every control starts on it. |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string; shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: unit, scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt(drawn)` | A function returning the alt text for the bars actually drawn (or a string). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
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
| `label` | optional, for a control: what the control is called, two to four words in the story's language |

On a bridge a mark is a step (or the opening) by its `name`. The steps keep their story order: `reorder` is refused, and a bracket of one step `of: "whole"` is refused (bracket a run of steps: it prints their net change).

A resting gesture is drawn as it ends (a `count` prints its final figure). A control's picture is the resting page
plus that one gesture: a `bracket` spans its segments or bars and prints their sum; a `compare` lays a copy of the
other length under the subject, from where the subject starts; a `filter` steps the other bars back; a `reorder`
moves the bars.

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
- At least one gesture must be a control (`bracket`, `compare`, `filter` or `reorder`): a page the reader can only
  look at is a still.
- A gesture that changes nothing and two notes on one bar are refused.
- Write every `note`, `label` and `restLabel` in the storyboard's `language`.
- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is
  the journalist's own sentence, copied as written.
- `check()` tests only what the drawn data can decide, at the takeaway's precision (`Math.round(v) === 143`).
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the render refuses, read
  its message: a refusal on `gestures[i]` names the key to change and a value that works. If the picture is wrong,
  fix `beat.mjs` with a small `edit_file`, render and look again.
