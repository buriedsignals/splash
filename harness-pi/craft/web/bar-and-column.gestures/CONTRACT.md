# Bar and column (web), composed — what you write

The page is already designed: one bar per row, on one scale from zero, in the story's PALETTE.md and DIRECTION.md;
names in a left column, each value written after its bar; every bar answers a hover, a tap or the keyboard with its
share of the whole and its rank. YOU decide the staging: an ordered list `gestures`, in the order the story tells it.
Nothing is staged that you do not write.

The page splits your gestures in two:

- **Resting gestures** — `highlight`, `name`, `annotate`, `reference`, `count`, `reveal`, `pull-back` — are drawn on
  the page the reader lands on, all at once, as a still plate draws them. Their notes are written under the title.
- **Every other gesture** — `bracket`, `compare`, `filter`, `zoom`, `reorder`, `rescale` — becomes ONE control the
  reader turns on: two pills, the page as it lands (`restLabel`) and the page with that gesture applied. Its `note`
  is the sentence printed under the controls while it is on. A page needs at least one of these.

With JavaScript off the page is the resting picture with every note written, and every control still works.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports what THIS story's page
says. `render-beat.mjs` (already in the folder) checks it, draws the page, checks it in a real browser and prints
`look at: <png>`.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch with
`write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | EVERY row as `{ name, value }`, from `data.json`, sorted from the largest. One row per name. Values may be zero or negative. The page draws the rows your gestures act on and as many others as it has room for, and states the rest. |
| `gestures` | The staging, in story order (below). |
| `unit` | The unit line above the bars ("million trips, 2025"). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `restLabel` | The words of the pill that shows the page as it lands, e.g. "The ranking alone". Every control starts on it. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: unit, scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bars (a string, or a function of the drawn rows). |
| `detail(r)` | Optional. What a bar answers after its name and value, from `r = { name, value, share, rank, count }` (`share` in percent). Without it the bar answers its share and its rank. |
| `scope(shown, all)` | Optional. The line printed under the bars when the page has room for only some rows, e.g. `(shown, all) => \`The ${shown} largest of ${all}\``. Without it the page prints "12 / 40". |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

On this page a resting gesture is drawn as it ends (a `count` prints its final figure, a `reveal` and a
`pull-back` are the whole chart). A control's picture is the resting page plus that one gesture: a `bracket` stacks
its rows into one bar with their sum at its end (a bracket of one row `of: "whole"` stacks every other row onto it,
so the bar becomes the whole); a `compare` lays a copy of the other length inside the subject's band; a `filter`
keeps only its rows; a `reorder` moves the rows; a `rescale` or a `zoom` moves the value scale.

```js
gestures: [
  { do: "highlight", mark: "Alpha" },
  { do: "bracket", mark: "Alpha", of: "whole", label: "Share of the total", note: "60 of 100" },
  { do: "compare", marks: ["Alpha", "Beta"], label: "Against Beta", note: "three times Beta's 20" },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one row, written exactly as `rows` names it |
| `marks` | several rows. For `compare`: the subject first, then the row (or rows, added up) it is compared with. For `bracket` and `filter`: the rows it acts on |
| `of` | what a bracket or compare measures against: `"whole"` (the total of every row) or a list of rows |
| `value` | a number (a reference line's level, a rescale's new top), or `"descending"` / `"ascending"` for reorder |
| `note` | the words drawn with the gesture, in the story's language. A zoom's note prints its factor ("×4") |
| `label` | optional, for a control: what the control is called, two to four words in the story's language. Without it the control is named by its rows and figures |

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

Leave out aggregate rows (a "Total" or "World" row is not a member). Large raw values may be rescaled
(tonnes → billions of tonnes) when the unit says so.

- Never type the rows or their numbers: `beat.mjs` must read `data.json`, or the render refuses it.

## Rules

- Every gesture must serve the confirmed takeaway: it acts on a row the takeaway names (or its comparison), or it
  states one of the takeaway's figures. A gesture about anything else is refused.
- Every number in a `note` is computed from the rows (a value, a sum, a share, a difference, a ratio), written at the
  precision you choose. A number the rows do not give is refused. "twice", "three times", "half", "highest",
  "lowest" in a note are checked against the rows.
- At least one gesture must be a control (`bracket`, `compare`, `filter`, `zoom`, `reorder` or `rescale`): a page
  the reader can only look at is a still.
- A gesture that changes nothing (the same highlight twice, a reorder into the order the rows already have, a
  rescale to the top the scale already has) and two notes on one row are refused.
- Write every `note`, `label` and `restLabel` in the storyboard's `language` — the same language as the title —
  whatever language the data's column names are in. Never put a data column's name in a sentence.
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that
  base said in the unit or the standfirst — never as 0.0039.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita,
  compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- Leave out aggregate rows (a "Total" or "World" row is not a member).
- `check()` tests only what the drawn data can decide, comparing a computed value with the takeaway's figure at the
  takeaway's precision (`Math.round(v) === 233`), never with strict equality on a raw division.
- Every number in a sentence is computed from `data.json`, never typed — except the title, which is the journalist's
  own sentence, copied as written.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the render refuses,
  read its message: a refusal on `gestures[i]` names the key to change and a value that works. If the picture is
  wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
