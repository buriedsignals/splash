# Scatter (scrolly) — what you write

The page is already designed: it comes from the worked example
`proof/scrolly-scatter-income-life-expectancy` and the story's PALETTE.md and DIRECTION.md. Points,
axes, colours, type, layout and the CHOREOGRAPHY are done. The graphic stays fixed while six cards of
prose travel up over it, and the reader's scroll moves the picture continuously from one card's state
to the next:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the cloud on an ordinary (linear) x axis: everything piled against the left edge | `cards.linear` |
| 2 | the x axis turns logarithmic: every point slides to its new x, the ticks and the axis name change | `cards.log`, `notes.log` |
| 3 | the declared break is drawn down the plot | `cards.break`, `notes.break` |
| 4 | under the break: the band of y, its two extremes ringed and named, the points above step back | `cards.below`, `notes.below` |
| 5 | over the break: the same | `cards.above`, `notes.above` |
| 6 | the plate: the break, the band above, both claims (`belowNote`, `aboveNote`) | `limits` |

A scatter's argument is the SHAPE of the cloud: no point is drawn in the accent. The accent goes to
the break and its bands. **This kit draws no bubble size**: every point has one radius. With
JavaScript off the page shows card 6's picture and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
points and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, draws the page, checks it in a real browser and prints
`look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## The reading `r`

Every word function receives `r`, computed by the render from your `points` and `breakAt`:

| Field | What it is |
|---|---|
| `r.count` | how many points the cloud has |
| `r.breakAt` | your `breakAt` |
| `r.below`, `r.above` | each side of the break (`x < breakAt`, `x >= breakAt`): `{ count, lo, hi, range }` — `lo` / `hi` the points with the lowest and highest y, each `{ name, x, y }`; `range` = `hi.y − lo.y` |
| `r.ratio` | `below.range ÷ above.range` — how many times narrower the band above is |
| `r.firstTenth`, `r.firstTenthShare` | how many points (and what percent) sit in the first tenth of the linear x axis (`x < 0.1 × largest x`) — what card 1 shows |
| `r.xMin`, `r.xMax` | the smallest and largest x |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `points` | One `{ name, x, y }` per row that has BOTH measures (at least 10), from `data.json`; `name` in the story's language (cards 4 and 5 name the extremes). Every x above 0, spanning at least a factor of 10 (card 2 turns the axis logarithmic). Leave out aggregates. |
| `breakAt` | The declared threshold on x (a number inside the data's range). Each side needs at least 3 points. |
| `xName` | The x axis name ("income per person, in dollars"). |
| `linearQualifier`, `xQualifier` | What follows the x name on each scale: "(linear scale)" on card 1, "(log scale)" from card 2 on. |
| `yName` | The y axis name with its unit ("life expectancy at birth, in years"). |
| `xTick(v)` | How an x tick is printed ("25k"), in the story's language. The ticks are computed. |
| `format(v)` | How a y value is printed (the extremes' labels, and the figures cards 4 and 5 owe). |
| `cards` | `{ linear(r), log(r), break(r), below(r), above(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.count`; card 3 `r.below.count` and `r.above.count`; card 4 `format(r.below.lo.y)` and `format(r.below.hi.y)`; card 5 `format(r.above.lo.y)` and `format(r.above.hi.y)`. |
| `notes` | `{ log(r), break(r), below(r), above(r) }` — the short accent note in the header while cards 2 to 5 are read (a few words: "log scale", "41 years apart below"). |
| `belowNote(r)`, `aboveNote(r)` | The two claims drawn on the plot, on each side of the break: each states its side's count and its spread (`Math.round(r.below.range)`). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6: what the cloud cannot say, the limits the journalist named (correlation is not causation, when it applies). |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text describing the cloud and the break (a string, or a function of `r`). |
| `evidenceLevels` | Optional, 3. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a point carries a size, has no name, or has x ≤ 0;
there are fewer than 10 points; x spans less than a factor of 10; y spans too little of its tens;
`breakAt` leaves fewer than 3 points on a side; a card does not state its figure; a claim does not
state its side's count and spread; or a card, a note, a claim or the alt states a number no figure
of `r` rounds to.

## Reading the data

Rows are arrays; find columns by name. Example with neutral names:

```js
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [PLACE, INCOME, OUTCOME] = [col("place"), col("income"), col("outcome")];
const points = data.rows
  .map((r) => ({ name: r[PLACE], x: Number(r[INCOME]), y: Number(r[OUTCOME]) }))
  .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > 0);
```

Filter to ONE year first, so each row is one point.

## Rules

- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the axis name or the limits — never as 0.0039. The y axis runs in tens: a y measure that spans less (a share 0.2 to 0.9) is drawn as a percentage.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(r.ratio) === 3`, or to one decimal), never with strict equality on the raw division.

- Every number in a card, a note, a claim or the alt is taken from `r` (through `format()` for y values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language` — point names included. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong (a card cut, a label over a point, a wrong number), fix `beat.mjs` with a
  small `edit_file`, render and look again.
