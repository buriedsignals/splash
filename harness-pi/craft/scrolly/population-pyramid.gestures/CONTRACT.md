# Population pyramid (scrolly), composed — what you write

The page is already designed: the first series grows left of a central spine, the second right, both on one scale; rows youngest first (the foot), never reordered; names in a left column (the pyramid: on its spine), values at the marks'
tips, one value scale for every card, in the story's PALETTE.md and DIRECTION.md. The graphic stays fixed while
cards of prose travel up over it; the scroll moves the picture continuously from one card's state to the next.
YOU decide the staging: an ordered list `gestures`, one card each, in story order. After your last gesture the page
adds a closing card: the whole chart returns, what you marked stays marked, and the card reads your `limits`.

You write ONE file, `beat.mjs`, reading `data.json` beside it. `render-beat.mjs` checks every gesture and every card's
words against the data, draws the page, checks it in a browser and prints `look at: <png>` (one PNG per card in
`renders/`). Read `beat.example.mjs` first, then write this story's from scratch with `write_file`.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `series` | The name(s) of the value(s) each row carries, in order. |
| `rows` | One row per key, from `data.json`: `series: ["Hommes", "Femmes"]`, `rows: [{ name: "0-4", values: [222640, 211390] }]`. A value the data lacks is `null`: the row says "n/a". |
| `gestures` | The staging: one gesture per card (below), each with its `card`. |
| `unit` | The unit line above the marks. |
| `format(v)` | How a value is printed (decimals, decimal comma or point). |
| `title` | The journalist's takeaway from STORYBOARD.md, copied word for word (an array may add shorter forms). |
| `limits` | The closing card: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line. |
| `alt` | The alt text (a string, or a function of the drawn row names). |
| `scope(shown, all)` | Optional: the line printed when the page draws only some rows. |
| `check()` | Throws if the data no longer supports the title. |

## The gestures you may use

| `do` | what the reader sees |
|---|---|
{{GESTURES}}

A `bracket` adds up a run of bands (both sides) and prints their sum. `reorder` is refused: the bands keep their age order.

A gesture's `mark` (or `marks`) names a **mark** — `"<row> · <series>"`, e.g. `"Chine · 2023"` — or a **row**
(`"Chine"`: both its marks) or a **series** (`"2023"`: that value in every row). A `compare` names two marks, the
subject first: `{ do: "compare", marks: ["Chine · 2023", "Chine · 2000"], card: "…" }`. `note` is the short line the
header prints while the card is read; `card` is the card's prose (a sentence or an array of paragraphs).

## Rules

- Every gesture serves the takeaway: it acts on a row or series the takeaway names, or states one of its figures.
- Every number in a `note` or a `card` is computed from the rows — a value, a row's change between its two values, a
  ratio, how many rows one series leads — at the precision you choose; a number the data does not give is refused,
  and "twice", "triple", "half" are checked against the ratio the card's picture draws.
- Each card states a figure its picture shows. Do not write band labels such as "60-64" in a card (read as numbers).
- Two notes on one row are refused; give the second gesture a `card` only.
- Write every word in the storyboard's `language`. Never type the rows: `beat.mjs` must read `data.json`.
- After `write_file`, call `render_beat`, then `look` at the PNGs. A refusal on `gestures[i]` names the key to change
  and a value that works.
