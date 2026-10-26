# Bar and column (scrolly), composed — what you write

The page is already designed: one bar per row, on one scale from zero, in the story's PALETTE.md and
DIRECTION.md; names in a left column, each value written after its bar. The graphic stays fixed while cards of
prose travel up over it, and the reader's scroll moves the picture continuously from one card's state to the
next. YOU decide the staging: an ordered list `gestures`, in the order the story tells it. Each gesture is ONE
card: its picture is the gesture, its prose is the gesture's `card`. After your last gesture comes a closing
card the page adds itself: the whole chart returns (whatever was zoomed or filtered comes back, what your
gestures marked stays marked) and the card reads your `limits`. With JavaScript off the page shows that closing
picture, every note written, and every card's words.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the data and the
WORDS of this story's cards. `render-beat.mjs` (already in the folder) checks the gestures and every card's words
against the rows, draws the page, checks it in a real browser and prints `look at: <png>` (card 1), with one PNG
per card in `renders/`.

`beat.example.mjs` (in the folder) is a worked example. Read it first, then write this story's from scratch
with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | EVERY row as `{ name, value }`, from `data.json`, sorted from the largest. One row per name. Values may be zero or negative. The page draws the rows your gestures act on and as many others as it has room for, and states the rest. |
| `gestures` | The staging: one gesture per card, in story order (below). Each carries its `card`. |
| `unit` | The unit line above the bars ("million trips, 2025"). |
| `format(v)` | How a value is printed (decimals, decimal comma or point for the language). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | The closing card: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bars (a string, or a function of the drawn rows). |
| `scope(shown, all)` | Optional. The line printed under the bars when the page has room for only some rows, in the story's language, e.g. `(shown, all) => \`The ${shown} largest of ${all}\``. Without it the page prints "12 / 40". |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | Optional, 2. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
| `highlight` | one row takes the accent colour; the others stay neutral |
| `name` | one row is ringed and labelled with its value |
| `annotate` | a short note written directly beside one row |
| `bracket` | a bracket spans a run of rows (or one row against the whole) and prints their sum or share |
| `compare` | two rows set side by side: a copy of the second's length laid against the first, the note states the gap or ratio |
| `reference` | a rule at a stated value, named in its note |
| `filter` | the rows the claim is about keep their ink; the others step back, nothing moves |
| `zoom` | the value scale enlarges onto a few rows to show what the overview cannot; the factor is printed |
| `reorder` | the same rows move into the order that answers the question |
| `rescale` | the value axis travels to a new top, the marks glide with it — never between two shots being compared |
| `count` | a figure climbs as the rows it counts appear; the note states where it ends |
| `reveal` | marks appear one by one in their natural order (rank or time) |
| `pull-back` | the frame returns to the whole chart, with what was shown still marked |

On the page, a gesture plays as the reader scrolls into its card and stays drawn after it: a bracket's spine runs
down its rows and its sum climbs beside it; a compare's copy grows inside the subject's bar; a count's figure
climbs in the header. A gesture's `note` is written in the header while its card is read.

```js
gestures: [
  { do: "highlight", mark: "Alpha", card: "Alpha recorded 60, the largest of the four." },
  { do: "bracket", mark: "Alpha", of: "whole", note: "60 of 100", card: "Of the 100 recorded in all, 60 were Alpha's." },
  { do: "compare", marks: ["Alpha", "Beta"], note: "three times Beta's 20", card: "Laid against Beta's 20, Alpha's 60 is three times as long." },
]
```

| key | meaning |
|---|---|
| `do` | one gesture from the table |
| `mark` | one row, written exactly as `rows` names it |
| `marks` | several rows. For `compare`: the subject first, then the row (or rows, added up) it is compared with. For `bracket`: the rows it adds up |
| `of` | what a bracket or compare measures against: `"whole"` (the total of every row) or a list of rows |
| `value` | a number (a reference line's level, a rescale's new top), or `"descending"` / `"ascending"` for reorder |
| `note` | the words drawn with the gesture, in the story's language. A zoom's note prints its factor ("×4") |
| `card` | the card's prose: the sentence (or an array of paragraphs) the reader reads while this gesture plays, in the story's language |

## Rules

- Every gesture carries a `card`. A card states the figure its picture shows: the value of the row a highlight,
  name or annotate marks; a bracket's sum (or its share of the whole); a compare's two lengths, gap or ratio; a
  reference's level; a count's final figure; a zoom's factor.
- Every number in a `card` and in a `note` is computed from the rows (a value, a sum, a share, a difference, a
  ratio), written at the precision you choose. A number the rows do not give is refused. "twice", "three
  times", "half" in a card are checked against the ratio that card's picture draws: say them on the card of the
  compare that shows them.
- Every gesture must serve the confirmed takeaway: it acts on a row the takeaway names (or its comparison), or it
  states one of the takeaway's figures. A gesture about anything else is refused.
- A gesture that changes nothing (the same highlight twice, a reorder into the order the rows already have) and
  two notes on one row are refused.
- Write every `card` and `note` in the storyboard's `language` — the same language as the title — whatever
  language the data's column names are in. Never put a data column's name in a sentence.
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values),
  with that base said in the unit or the limits — never as 0.0039.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per
  capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- Leave out aggregate rows (a "Total" or "World" row is not a member).
- `check()` tests only what the drawn data can decide, comparing a computed value with the takeaway's figure at
  the takeaway's precision (`Math.round(v) === 233`), never with strict equality on a raw division.
- Every number in a sentence is computed from `data.json`, never typed — except the title, which is the
  journalist's own sentence, copied as written.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names (card 1) and at
  the other cards' PNGs. If the render refuses, read its message: a refusal on `gestures[i]` (or
  `gestures[i].card`) names the key to change and a value that works. If a picture is wrong, fix `beat.mjs` with
  a small `edit_file`, render and look again.
