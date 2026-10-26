# Hex grid / hex cartogram (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-hex-grid-europe-protection`
and the story's PALETTE.md and DIRECTION.md. It is ONE equal hexagon per country on a DESIGNED layout,
over an unmoving live MapTiler map of Europe, and it puts counts and rates on the same cells, one after
the other: a big country leads by count, a smaller one by rate. The page stays fixed while six cards
of prose travel up over it; the scroll fills, re-colours, reorders and zooms the cells continuously.
The layout, the two ramps and keys, the honeycomb and the CHOREOGRAPHY are done:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the grid, uncoloured; the `origin` country greyed (on the grid, outside the count) | `cards.grid` |
| 2 | the cells take the count's classes; the count key | `cards.count`, `countNote` |
| 3 | the same cells cross-fade to the rate's classes (per 1 000 residents); the rate key | `cards.rate`, `rateNote` |
| 4 | the cells leave the map for a honeycomb in rate order, each with its rate | `cards.rank`, `rankNote` |
| 5 | back on the map: the top rate and the largest count ringed with their rates | `cards.pair`, `pairNote` |
| 6 | the grid by rate, its key and the note on the origin (`originNote`) | `limits` |

The cells are labelled with their ISO alpha-3 codes. With JavaScript off the page shows the grid by
rate with its key and every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. `render-beat.mjs` (already in the folder)
computes every rate (count ÷ population × 1 000) and rank, checks your words against them, bakes the
backdrop, checks the page in a real browser and prints `look at: <png>` (card 1), with one PNG per
card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**The layout holds these 32 countries only** (ISO alpha-3): ISL NOR SWE FIN IRL DNK EST LVA NLD DEU
POL LTU UKR BEL LUX CHE CZE SVK HUN ROU PRT ESP FRA LIE AUT SVN HRV BGR MLT ITA GRC CYP. A row outside
them is refused; layout countries the story does not give are left out. The choreography needs the
ranking to turn over: the top country by rate must not be the top by count.

## The reading `r`

| Field | What it is |
|---|---|
| `r.origin` | `{ iso, name }` |
| `r.count`, `r.per` | how many host countries; the rate's base (1 000 residents) |
| `r.topRate`, `r.largestCount`, `r.secondCount`, `r.lastRate` | the country with the highest rate, the largest and second count, the lowest rate — each `{ iso, name, count, population, rate, rateRank, countRank }` |
| `r.ranked`, `r.byCount` | every host by rate, and by count, largest first (same fields) |
| `r.countBreaks`, `r.rateBreaks` | your class limits |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `origin` | `{ iso, name }` — the country the people counted come from: a cell of the layout, greyed, outside the count (not in `rows`). |
| `rows` | One `{ iso, name, count, population }` per host country, from `data.json`: `count` the number the count card shades by, `population` its residents (same period as far as the data allows). Both above zero. At least 6. |
| `countBreaks` | 4 rising numbers, the count's class limits (five classes); printed in thousands ("50 k"). |
| `rateBreaks` | 4 rising numbers, the rate's class limits per 1 000 residents. |
| `number(v, d)` | How a number is printed with `d` decimals in the story's language. Rates are printed and checked at one decimal, counts at none. |
| `countUnit`, `rateUnit` | The two keys' unit lines (the rate's says "per 1 000 residents"). |
| `countNote(r)`, `rateNote(r)`, `rankNote(r)`, `pairNote(r)` | The header's accent note on cards 2, 3, 4 and 5. |
| `originNote(r)` | The line under the key about the origin's cell. |
| `cards` | `{ grid(r), count(r), rate(r), rank(r), pair(r) }` — the prose of cards 1 to 5. Card 1 must state `r.origin.name`; card 2 `r.largestCount.name`, `number(r.largestCount.count, 0)` and `r.secondCount.name`; card 3 `r.topRate.name` and `number(r.topRate.rate, 1)`; card 4 `r.topRate.name`, `r.largestCount.rateRank`, `r.lastRate.name` and `number(r.lastRate.rate, 1)`; card 5 `number(r.topRate.rate, 1)` and `number(r.largestCount.rate, 1)`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6, a string: the reading line (every country weighs one cell; the layout is drawn by hand) and the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text (a string, or a function of `r`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a row or the origin is not on the layout; the
origin is among the rows; a country appears twice or has no count or population above zero; the
same country leads by count and by rate; the breaks are not 4 rising numbers; a card does not state
what its picture shows; or a card, a note or the alt states a number no figure of `r` rounds to.

## Reading the data

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, NAME, AMOUNT, RESIDENTS] = [col("iso3"), col("country"), col("amount"), col("residents")];
const rows = table.rows.filter((r) => r[CODE] !== "XXX").map((r) => ({ iso: r[CODE], name: r[NAME], count: Number(r[AMOUNT]), population: Number(r[RESIDENTS]) }));
```

## Rules

- The rate is drawn per 1 000 residents and said so in `rateUnit`.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(r.topRate.rate * 10) === 361`), never with strict equality on the raw division.
- Every number in a card, a note or the alt is taken from `r` (through `number()`), never typed — except the title, which is the journalist's own sentence, copied as written, and the base "1 000". A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. If the render refuses, read its message and fix `beat.mjs`.
  If a picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
