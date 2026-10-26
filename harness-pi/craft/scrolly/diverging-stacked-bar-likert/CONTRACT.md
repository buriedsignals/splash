# Diverging stacked bar (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-diverging-stacked-electricity`
and the story's PALETTE.md and DIRECTION.md. Every row is a 100 % bar split into levels: a LEFT side
(one ramp deepening outward), a NEUTRAL in the centre, a RIGHT side (another ramp deepening outward).
Bars, colours, type, legend and the CHOREOGRAPHY are done. The form's own move is re-anchoring a 100 %
bar on its neutral; the scroll performs it, then reads each side. The graphic stays fixed while six
cards of prose travel up over it, and the reader's scroll moves the picture continuously from one
card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | plain 100 % bars, aligned left, on 0–100 | `cards.hundred`, `unitLine` |
| 2 | each bar slides until the middle of its neutral sits on the axis: the lean appears | `cards.centre` |
| 3 | only the left levels keep their ramp; the left totals at the ends; the row leaning furthest left in bold | `cards.left`, `leftNote` |
| 4 | the same for the right side | `cards.right`, `rightNote` |
| 5 | the subject climbs to the first row and opens two lanes: its neutral above, both sides laid end to end below from the same start | `cards.compare`, `compareNote` |
| 6 | every row and total, the subject in the accent | `limits` |

The rows are drawn from the largest left total down; each row's totals and who leans furthest each
way are computed. With JavaScript off the page shows card 6's picture and every card's words. You do
not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every card function, the three notes and `alt` receive `r`, computed by the render from your `rows`.
A row's reading is `{ key, label, left, centre, right, sides, levels }`: `left` / `right` = the sum of
that side's levels, `centre` = the neutral's share, `sides` = `left + right`, `levels` = your levels.

| Field | What it is |
|---|---|
| `r.count` | how many rows |
| `r.rows` | every row's reading, from the largest `left` down (the drawn order) |
| `r.subject` | the subject's reading |
| `r.leaningLeft` | the row with the largest `left` (card 3's bold row) |
| `r.leaningRight` | the row with the largest `right` (card 4's bold row) |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | One `{ key, label, left, centre, right }` per row (2 to 12). `key` identifies the row (the data's own name), `label` is printed. `left` and `right` are arrays of levels `{ key, label, value }` ordered OUTWARD from the centre (the mildest level first, the most extreme last); `centre` is one level. `value` is the level's SHARE of the row in percent, so a row's levels add up to 100. Every row carries the same levels in the same order. |
| `subject` | The `key` of the row the takeaway is about. It is drawn in the accent and compared in card 5. |
| `leftName` / `rightName` / `centreName` | The names of the two sides and of the neutral, printed in the legend. |
| `unitLine` | The line above the bars: what the shares are of ("share of electricity generation in 2024, in %"). |
| `format(v)` | How a share is printed, WITH its % sign ("68,9 %", "68.9%"), in the story's language. |
| `cards` | `{ hundred(r), centre(r), left(r), right(r), compare(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 3 must state `format(r.leaningLeft.left)`; card 4 `format(r.leaningRight.right)`; card 5 `format(r.subject.centre)` and `format(r.subject.sides)`. |
| `leftNote(r)` | The header note in card 3, stating `format(r.leaningLeft.left)`. |
| `rightNote(r)` | The header note in card 4, stating `format(r.leaningRight.right)`. |
| `compareNote(r)` | The header note in card 5, stating `format(r.subject.centre)` and `format(r.subject.sides)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the rows and the subject's split (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: there are fewer than 2 or more than 12 rows; a row
does not carry the same levels as the first; a row's levels do not add up to 100; a share is
negative; the subject has no neutral (card 5 lays both sides under it); a card or a note does not
state its figure; or a card, a note or the alt states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays in `columns` order. Keep ONE year and compute every level's share of its row:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const LEFT = [["agree", "agree"], ["strongly_agree", "strongly agree"]];        // outward
const RIGHT = [["disagree", "disagree"], ["strongly_disagree", "strongly disagree"]];
const CENTRE = ["neutral", "neither"];
const rows = table.rows.filter((r) => Number(r[col("year")]) === 2024).map((r) => {
  const total = [...LEFT, CENTRE, ...RIGHT].reduce((s, [c]) => s + Number(r[col(c)]), 0);
  const level = ([c, label]) => ({ key: c, label, value: (Number(r[col(c)]) / total) * 100 });
  return { key: r[col("group")], left: LEFT.map(level), centre: level(CENTRE), right: RIGHT.map(level) };
});
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note or the alt is taken from `r` (through `format()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong row in the accent, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
