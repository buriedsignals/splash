# Cartogram (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-cartogram-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. It argues that every mean is a choice of what counts: the
reader watches a map of Europe (a LIVE MapTiler map, every country shaded by class) become a tile
cartogram on a DESIGNED grid, one equal tile per country, then the tiles resize to a weight — three
ways of counting, three means. The page stays fixed while six cards of prose travel up over it; the
scroll drives every gesture continuously. The grid, the ramp, the counters, the rule and the
CHOREOGRAPHY are done:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | the map: every country as its territory, shaded by class | `cards.map` |
| 2 | the country that takes the most room picked out (`widestLabel` on the map, `subjectNote` beside it); the area-weighted mean counts up | `cards.widest`, `counters.area` |
| 3 | every country shrinks or swells into one equal tile; the country mean counts up | `cards.tiles`, `counters.country` |
| 4 | every tile resized to its `weight`; the weight-weighted mean counts up | `cards.weight`, `counters.weight` |
| 5 | the three means on one 0–100 rule, the tiles stepping back | `cards.means` |
| 6 | the equal tiles again, the country with no value ringed (`missingNote`) | `limits` |

Under the live map lies a frozen picture of cards 1 and 2, which is what a reader without a script or
a network sees under the tiles. With JavaScript off the page shows the equal tiles over the map and
every card's words. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes the
three means from your rows and the kit's shapes, checks your words against them, bakes the map's
pictures, checks the page in a real browser and prints `look at: <png>` (card 1), with one PNG per
card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**The grid holds these 41 countries only** (ISO alpha-3): ISL NOR SWE FIN EST IRL GBR DNK LVA RUS NLD
DEU POL LTU BLR BEL LUX CZE SVK UKR PRT ESP FRA CHE AUT HUN MDA ITA SVN HRV SRB ROU MLT MNE BIH MKD
BGR ALB GRC TUR CYP. A row outside them is refused; grid countries the story does not give are left
out. The tiles are labelled with these codes. At most ONE country may have no value (card 6 rings it).

**The counters are written for French**: they print the mean with a decimal comma, whatever the
story's language (the render prints a NOTE when it is not French).

## The reading `r`

| Field | What it is |
|---|---|
| `r.count`, `r.reported` | how many tiles; how many countries carry a value |
| `r.byCountry`, `r.byArea`, `r.byWeight` | the three means: unweighted, weighted by territory (km², from the kit's shapes), weighted by your `weight` |
| `r.gap` | `byCountry − byArea` |
| `r.widest` | `{ iso, name, value, weight, areaShare }` — the country with the most territory, and its percent of the territory of the countries with a value |
| `r.heaviest`, `r.second`, `r.lightest` | the countries with the largest, second largest and two smallest weights (same fields) |
| `r.byWeightRank` | every country with a value, by weight, largest first |
| `r.missing` | the row with no value, `[{ iso, name }]` (empty or one) |
| `r.breaks`, `r.value(iso)` | your breaks; a country's value or `null` |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | THE JOIN. One `{ iso, name, value, weight }` per country: `iso` an ISO alpha-3 code of the grid; `name` its name in the story's language; `value` the share the means average (a percent), or `null` when the source does not report it (a hollow tile); `weight` what card 4 sizes the tile by — the total the share is a share of (e.g. the country's production), 0 when it has none. |
| `breaks` | 2 to 5 rising numbers, the class limits of the map's and the tiles' shading. |
| `format(b)` | How a class limit is printed in the key ("94 %"). |
| `number(v, d)` | How a number is printed with `d` decimals in the story's language (`v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })`). The means are checked in this format. |
| `unit` | What the colour is, beside the key. |
| `missingLabel` | The key's word for a country with no value. |
| `counters` | `{ area, country, weight }` — the three short counters, each holding `{n}` once ("by km²: {n} %"). |
| `subjectNote(r)` | The note beside the widest country on card 2 (its name, its share of the territory, its value). |
| `widestLabel(r)` | Its name on the live map on card 2 ("RUSSIA · 35.9 %"). |
| `missingNote(r)` | The note of card 6 in the stage's corner: the country with no value. |
| `cards` | `{ map(r), widest(r), tiles(r), weight(r), means(r) }` — the prose of cards 1 to 5. Card 1 must state `r.count`; card 2 `r.widest.name` and `number(r.byArea, 1)`; card 3 `number(r.byCountry, 1)`; card 4 `number(r.byWeight, 1)`; card 5 all three. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6, a string: the country with no value, how the layout was made (by hand), the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text (a string, or a function of `r`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a row is not on the grid, appears twice, or has a
value that is not a number or a weight under zero; fewer than 6 countries carry a value; more than
one carries none; a card does not state its mean; or a card, a note, a counter or the alt states a
number no figure of `r` rounds to.

## Reading the data

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, PART, WHOLE] = [col("iso3"), col("part"), col("whole")];
const rows = table.rows.map((r) => ({ iso: r[CODE], name: r[CODE], value: r[WHOLE] > 0 ? (r[PART] / r[WHOLE]) * 100 : null, weight: Number(r[WHOLE]) }));
```

## Rules

- The value is a share (a percent) and the weight the total it is a share of: the weighted mean is
  then the share of the sum.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v * 10) === 651`), never with strict equality on the raw division.
- Every number in a card, a note or the alt is taken from `r` (through `number()`), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. The first render bakes the map's pictures (a few minutes).
  If the render refuses, read its message and fix `beat.mjs`. If a picture is wrong, fix `beat.mjs`
  with a small `edit_file`, render and look again.
