# Waterfall / bridge (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-germany-electricity-bridge` and the story's PALETTE.md and DIRECTION.md. Bars,
connectors, colours, type, layout and the CHOREOGRAPHY are done. A waterfall is a walk: the scroll
takes it one step per card, then opens the step that carries the story. The graphic stays fixed
while six cards of prose travel up over it, and the reader's scroll moves the picture continuously
from one card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the opening total rises from zero; the running total in the header | `cards.opening` (the header shows `running`) |
| 2 | the first step climbs (or drops) from the total's level, a connector behind it | `cards.step1`, `notes.step1` |
| 3 | the second step, from where the first landed | `cards.step2`, `notes.step2` |
| 4 | the third step, then its slot widens into its three `parts`, one bar each | `cards.step3`, `notes.step3` |
| 5 | the third step folds back; the closing total rises; the opening level carried across and the net change bracketed | `cards.closing`, `notes.closing` |
| 6 | the whole bridge, every value on its bar | `limits` |

The walk is fixed: an opening total, THREE steps, the third made of THREE parts, a closing total.
The header writes the running total with one decimal and a decimal COMMA (the drive's own), so this
kit serves stories written with a decimal comma. With JavaScript off the page shows card 6's picture
and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
steps and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) replays the
bridge, computes every figure, checks your words against them, draws the page, checks it in a real
browser and prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

| Field | What it is |
|---|---|
| `r.opening`, `r.closing` | the two totals |
| `r.net` | `closing − opening` (negative for a fall) |
| `r.steps` | the three steps, `[{ label, value, detail }]` (`value` signed; `detail` your step's own `detail`) |
| `r.parts` | the third step's three parts, `[{ label, value }]` |
| `r.levels` | `{ afterStep1, afterStep2 }` — the running level after the first two steps |
| `r.firstTwo` | the first two steps added together |
| `r.openingLabel`, `r.closingLabel` | the totals' labels |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `steps` | FIVE bars in story order: `{ label, short?, value, kind }`. The first and last are `kind: "total"` (opening and closing, above zero); the three between are `"increase"` (value positive) or `"decrease"` (value negative). The third step also gives `parts`: exactly three `{ label, short?, value }` adding up to its value (largest change first). A step may give `detail: { name: value }` — figures about it its card may state that the bridge does not draw (e.g. two components of a group), each COMPUTED. `short` is the label used when a column is narrow. |
| `unit` | The unit the net change is written in ("TWh"). |
| `unitLine` | The unit line above the bridge ("electricity generation, TWh"). |
| `running` | The header's running total, with the token `{v}` where the value goes ("total: {v} TWh"). |
| `format(v)` | How a value is printed (the plain number; the render adds `+` / `−` on steps), with a decimal comma. |
| `cards` | `{ opening(r), step1(r), step2(r), step3(r), closing(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.opening)`; card 2 `format(r.steps[0].value)`; card 3 `format(r.steps[1].value)` and `format(r.firstTwo)`; card 4 `format(r.steps[2].value)` and `format(r.parts[0].value)`; card 5 `format(r.closing)` and `format(r.net)` (format prints the number without its sign). |
| `notes` | `{ step1(r), step2(r), step3(r), closing(r) }` — the short accent note in the header while cards 2 to 5 are read (card 1 shows the running total). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: how to read the bridge (each step starts where the previous one landed; the two totals start from zero) and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the bridge (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: there are not exactly five bars of the right kinds;
a step's sign contradicts its kind; the third step has not exactly three parts, or they do not add
up to it; the bridge does not replay (opening + steps ≠ closing); the running level goes below zero;
`format` prints a decimal point; `running` has no `{v}`; a card does not state its figure; or a
card, a note or the alt states a number no figure of `r` (or a step's `detail`) rounds to.

## Building the steps

Compute each step as (later minus earlier) of a group of columns, and the totals as the sum of ALL
the groups, so the bridge balances by construction. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const at = (year) => data.rows.find((r) => Number(r[col("year")]) === year);
const sum = (row, keys) => keys.reduce((t, k) => t + Number(row[col(k)] ?? 0), 0);
const [A, B, C] = [["a1", "a2"], ["b"], ["c1", "c2", "c3"]];
const [first, last] = [at(2015), at(2024)];
const change = (keys) => sum(last, keys) - sum(first, keys);
const steps = [
  { label: "2015", value: sum(first, [...A, ...B, ...C]), kind: "total" },
  { label: "group A", value: change(A), kind: change(A) >= 0 ? "increase" : "decrease" },
  { label: "group B", value: change(B), kind: change(B) >= 0 ? "increase" : "decrease" },
  { label: "group C", value: change(C), kind: change(C) >= 0 ? "increase" : "decrease",
    parts: C.map((k) => ({ label: k, value: change([k]) })) },
  { label: "2024", value: sum(last, [...A, ...B, ...C]), kind: "total" },
];
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(-r.net) === 143`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language` — step labels included. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a label cut, a card cut, a wrong number), fix `beat.mjs` with a small
  `edit_file`, render and look again.
