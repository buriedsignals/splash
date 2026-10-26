# Dot strip (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-dot-strip-lowcarbon-spread`
and the story's PALETTE.md and DIRECTION.md. Every entity is a pin on a ruled 0–100 strip, its CODE in a
chip on a stem; colours, type, layout and the CHOREOGRAPHY are done. A strip shows the shape of a
field: the scroll moves the field on one strip before it opens into two. The graphic stays fixed while
six cards of prose travel up over it, and the reader's scroll moves the picture continuously from one
card's state to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | one strip at `from`, every pin with its code; the range as a large figure | `cards.field`, `figures(r).range` |
| 2 | every pin slides to `to`, a tick left where it stood; the median's mark moves and counts | `cards.travel`, `figures(r).median`, `medianName` |
| 3 | the floor's trail along the strip in the accent, the others stepping back | `cards.floor`, `figures(r).floor`, `floorTrail` |
| 4 | the ceiling's trail, the same | `cards.ceil`, `figures(r).ceil`, `ceilTrail` |
| 5 | both states' floor-to-ceiling brackets under the strip | `cards.spread`, `figures(r).spread`, `spreadBefore`, `spreadAfter` |
| 6 | the strip opens into two, `from` above and `to` below on one scale, a leader from each pin to its later self | `limits`, `splitNote` |

The floor, the ceiling, the medians and the spreads are computed. With JavaScript off the page shows
the two strips, every pin at its value, the subject and the ceiling named, and every card's words. You
do not change any of that.

This choreography is about the FLOOR: the subject must be the lowest mark in both states, and the
highest mark at `from` must still be the highest at `to` (cards 3 and 4 state each one's rise as the
floor's and the ceiling's). The values are shares on a 0–100 scale. The moving median is written with
a decimal comma, so the story's numbers are written with a decimal comma too.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
marks and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every card function, `figures`, the trail and spread labels, `splitNote` (when a function) and `alt`
receive `r`, computed by the render from your `marks`. A mark's reading is `{ name, label, code,
before, after, move }`, `move` = `after − before`.

| Field | What it is |
|---|---|
| `r.count`, `r.from`, `r.to` | how many marks, and your two states' names |
| `r.marks` | every mark's reading |
| `r.subject`, `r.ceiling` | the floor's mark (your subject) and the ceiling's mark |
| `r.floorBefore`, `r.floorAfter` | the lowest value in each state |
| `r.ceilBefore`, `r.ceilAfter` | the highest value in each state |
| `r.floorRise`, `r.ceilRise` | how far the floor and the ceiling moved |
| `r.medianBefore`, `r.medianAfter` | the median in each state |
| `r.spreadBefore`, `r.spreadAfter`, `r.spreadClosed` | ceiling minus floor in each state, and how much the spread closed |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `marks` | One `{ name, label, code, before, after }` per entity (4 to 30), from `data.json`: `before` / `after` its value at the two states, from 0 to 100; `code` a short form of 2 to 5 letters ("POL") printed in its chip (required); `label` its printed name (optional). |
| `subject` | The `name` of the floor's mark: the lowest in both states. |
| `from` / `to` | The two states' names ("2000", "2024"). |
| `unit` | The line above the strip: what a value is ("low-carbon share of the country's electricity, in %"). |
| `unitMark` / `medianName` | The moving median is written `<medianName> <value> <unitMark>` ("median 70,6 %"). |
| `format(v)` | How a value is printed, with a decimal comma ("31,1"). |
| `cards` | `{ field(r), travel(r), floor(r), ceil(r), spread(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.floorBefore` and `r.ceilBefore`; card 2 `r.medianBefore` and `r.medianAfter`; card 3 `r.subject.before`, `r.subject.after` and `r.floorRise`; card 4 `r.ceiling.before`, `r.ceiling.after` and `r.ceilRise`; card 5 `r.spreadBefore` and `r.spreadAfter` — each at the precision you write it (`Math.round(r.floorRise)` is fine). |
| `figures(r)` | The large figure over the strip while each card is read: `{ range: [label, value], median: label, floor: [label, value], ceil: [label, value], spread: [label, value] }`. `range` states the two `from` ends, `floor` the floor's rise, `ceil` the ceiling's, `spread` both spreads; the median's value is written by the page. |
| `splitNote` | The note over card 6's two strips ("2000 above, 2024 below, same scale"; a string or a function of `r`). |
| `floorTrail(r)` / `ceilTrail(r)` | The label under the floor's / the ceiling's trail, stating its rise ("+30 points"). |
| `spreadBefore(r)` / `spreadAfter(r)` | The labels of card 5's two brackets, each stating its spread ("2000: 95,1 points"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the strips (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: there are fewer than 4 or more than 30 marks; a
value is outside 0–100; a mark has no short code; the subject is not the lowest mark in both states;
the ceiling changes mark between the states; `format` writes a decimal point; a card, a figure or a
label does not state its figure; or one states a number no figure of `r` rounds to.

## Reading the data

Rows are arrays in `columns` order. For every entity, read its row at each state and compute the
share:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, CODE, YEAR, PART, TOTAL] = [col("region"), col("region_code"), col("year"), col("part"), col("total")];
const shareOf = (name, year) => { const r = table.rows.find((x) => x[NAME] === name && Number(x[YEAR]) === year); return (Number(r[PART]) / Number(r[TOTAL])) * 100; };
const names = [...new Set(table.rows.map((r) => r[NAME]))];
const marks = names.map((name) => ({ name, code: table.rows.find((r) => r[NAME] === name)[CODE], before: shareOf(name, 2000), after: shareOf(name, 2024) }));
```

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a figure, a label or the alt is taken from `r` (through `format()` or `Math.round`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong mark in the accent, a card cut, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
