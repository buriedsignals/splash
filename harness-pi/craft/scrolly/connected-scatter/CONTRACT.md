# Connected scatter (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-connected-scatter-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. Every entity is a hollow ring (its earlier state) joined
by a bowed dotted arc to a filled disc (its later state), on two measures at once; the axes, colours,
type, name seating and the CHOREOGRAPHY are done. The graphic stays fixed while six cards of prose
travel up over it, and the reader's scroll moves the picture continuously from one card's state to
the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | every entity a hollow ring at `from`; the subject named | `cards.start` |
| 2 | each entity slides along its arc to `to`; a counter of the entities whose y rose climbs | `cards.travel`, `upCount` |
| 3 | the entities whose x did NOT fall step back to a neutral: only those that moved left keep their colour | `cards.left` |
| 4 | the subject's arc in the accent, its two moves written; the others step back | `cards.subject`, `subjectCounts` |
| 5 | the x axis closes onto the crowd near the origin; the heaviest leave the frame, every small entity is named | `cards.zoom` |
| 6 | the whole axis again, the subject in the accent | `limits` |

Who rose, who moved left and the close-up's crowd are computed. With JavaScript off the page shows
card 6's picture and every card's words. You do not change any of that.

A connected scatter places 3 to 20 entities on TWO measures — x from zero, y a SHARE from 0 to 100 —
at TWO states. The reader reads the DIRECTION of each arc: up means more of y, right means more of x.
The two measures must be independent (not a level and that same level's share of the group).

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
entities and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes
every figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every card function, `upCount`, `subjectCounts`, `xName` / `yName` (when functions) and `alt` receive
`r`, computed by the render from your `entities`. An entity's reading is your entity plus `label`,
`dx` = `to.x − from.x`, `dy` = `to.y − from.y`, `isSubject`.

| Field | What it is |
|---|---|
| `r.count` | how many entities |
| `r.from`, `r.to` | your two states' names |
| `r.subject` | the subject's reading |
| `r.entities` | every reading |
| `r.up`, `r.down` | the readings whose y rose (largest rise first) / fell (largest fall first) |
| `r.left`, `r.right` | the readings whose x fell (largest fall first) / rose (largest rise first) — card 3 keeps `r.left` |
| `r.heaviest` | the reading with the largest x at `from` |
| `r.zoomMax` | the top of card 5's close-up |
| `r.crowd`, `r.outside` | the readings inside the close-up / those that leave the frame |
| `r.crowdRight` | the readings of the crowd whose x did not fall |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `entities` | One `{ name, label, code, from: { x, y }, to: { x, y } }` per entity, from `data.json`: `name` identifies it, `label` is how it is printed (optional), `code` is a short form of 2 to 5 letters ("FRA") printed when the label finds no room (required), x zero or more, y from 0 to 100. |
| `subject` | The `name` of the entity the takeaway is about. It is drawn in the accent. |
| `from` / `to` | The two states' names ("2000", "2024"). |
| `xName` / `yName` | Each measure and its unit, printed as the axis titles (a string, or a function of `r`). |
| `format(v)` | How a value or a move is printed ("4,2"). |
| `xTicks` | Optional: the x ticks. Left out, round steps up past the largest x. |
| `zoomMax`, `zoomOut`, `zoomTicks` | Optional: card 5's close-up. Left out, it closes on a round top just above every entity but the `zoomOut` heaviest (default 2), with five even ticks. |
| `cards` | `{ start(r), travel(r), left(r), subject(r), zoom(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `format(r.subject.from.x)`; card 2 `r.up.length`; card 3 `r.left.length`; card 4 `format(Math.abs(r.subject.dy))` and `format(Math.abs(r.subject.dx))`; card 5 `r.crowdRight.length`. |
| `upCount(r)` | Card 2's counter, a few words stating `r.up.length` ("16 of 16 cleaner at home"): it climbs from 0 to that number. |
| `subjectCounts(r)` | Written at the subject's arc in card 4: its two moves, both `format(Math.abs(...))` ("France: +4.2 pts at home · −11.8 pts in the group"). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the figures count and leave out, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the arcs (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 4. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: there are fewer than 3 or more than 20 entities; a
y is outside 0–100 or an x is negative; an entity has no short code; no entity moved left, or every
one did (card 3 would empty the picture or change nothing); the close-up holds fewer than three
entities or every entity; a card does not state its figure; or a card, a label or the alt states a
number no figure of `r` rounds to (sign aside: "lost 11.8 points" states a dx of −11.8).

## Reading the data

Rows are arrays in `columns` order. For every entity, read its row at each of the two states and
compute the two measures:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [NAME, CODE, YEAR, A, B] = [col("name"), col("code"), col("year"), col("measure_a"), col("measure_b")];
const rowOf = (name, year) => table.rows.find((r) => r[NAME] === name && Number(r[YEAR]) === year);
const state = (name, year) => { const r = rowOf(name, year); return { x: Number(r[A]), y: Number(r[B]) }; };
const names = [...new Set(table.rows.map((r) => r[NAME]))];
const entities = names.map((name) => ({ name, code: rowOf(name, 2000)[CODE], from: state(name, 2000), to: state(name, 2024) }));
```

If a measure is a share, compute it from the columns that make it (part ÷ total × 100), as the
worked example does — never read a column that is not in `data.json`.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a label or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (wrong entity in the accent, a card cut, a wrong number), fix `beat.mjs`
  with a small `edit_file`, render and look again.
