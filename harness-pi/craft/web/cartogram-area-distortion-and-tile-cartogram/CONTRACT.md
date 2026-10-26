# Tile cartogram (web) — what you write

The page is already designed: it comes from the worked example `proof/web-cartogram-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. It is one equal square per country on a DESIGNED grid
(roughly where a reader expects each country), shaded by class — not a live map: no basemap, no key.
The INTERACTION is done: ONE control lets the reader PUT THE GEOGRAPHY BACK, one step at a time — the
filed grid; every square near its true place (moved until none overlaps); every square at its
country's true area. The line of average over the plate is rewritten at each step: giving back the
PLACE leaves the mean by country unchanged, giving back the AREA turns it into the area-weighted mean
a choropleth shows. A sentence under the control says what each step costs. Hovering or tapping a
square answers its reading and what the chosen step did to it. With JavaScript off the steps still
swap. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows, the class breaks and the WORDS. `render-beat.mjs` (already in the folder) computes every
country's area and centroid (from the kit's frozen shapes, in an equal-area projection), both means,
the two relaxed layouts and every cost, draws the page, checks it in a real browser and prints
`look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**The grid holds these 41 countries only** (ISO alpha-3): ISL NOR SWE FIN EST IRL GBR DNK LVA RUS NLD
DEU POL LTU BLR BEL LUX CZE SVK UKR PRT ESP FRA CHE AUT HUN MDA ITA SVN HRV SRB ROU MLT MNE BIH MKD BGR
ALB GRC TUR CYP. A row outside them is refused; grid countries the story does not give are left out.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | THE JOIN. One `{ iso, name, value, … }` per country: `iso` the ISO alpha-3 code, `name` a SHORT name in the story's language (it must fit in a square — "R.-Uni", "Bosnie-H."), `value` the measure the takeaway is about or `null` when the source does not report the country (a hollow square). Extra fields ride along to `detail()`. |
| `breaks` | 2 to 6 rising numbers splitting the values into classes; every class must hold a country. |
| `format(b)` | How a break is printed ("94 %"). |
| `classLabel(c)` | One legend chip. `c` is `{ index, lower, upper }` (`lower` null for the lightest class, `upper` null for the darkest); it must print the limits. |
| `figure(v)` | The value printed on a square, short ("65"). |
| `number(v, d)` | How a number is printed with `d` decimals in the story's language. Means and costs are checked in this format. |
| `stageLabel` | The control's name ("What the map gives back"). |
| `stages` | The three steps' words: `{ grid: { label, announce }, place: { label, announce, note(s) }, area: { label, announce, note(s) } }`. `announce` must CONTAIN `label`. `note(s)`: `s` is `{ byCountry, byArea, tiles, medianPct, worstPct, worstName, gridMedianPct, biggestName, biggestScale, smallestName, smallestScale }` — the two means; how far, as a percent of the map's width, the squares end up from their true centroids at this step (median and worst, and the worst country), the same median for the filed grid; and, at the area step, the largest and smallest square as a multiple of a grid square. The `place` note must print `number(byCountry, 1)` and the `area` note `number(byArea, 1)`; both must print `number(medianPct, 1)`. |
| `total(t)` | The line of average over the plate at each step. `t` is `{ stage, mean, by, tiles, named }`: `mean` the mean that step shows (by country, or by area at `area`), `by` `"country"`/`"area"`, `tiles` how many squares, `named` how many squares are big enough to carry their name. Must print `number(mean, 1)`. |
| `detail(t)` | The tooltip for one square at one step. `t` is its row plus `{ stage, rank, of, tiles, classLabel, areaShare, travel, displaced, scale }`: `areaShare` = the percent of a choropleth's drawing the country covers; `travel` = how many grid cells its square moved; `displaced` = how far it ends from its true centroid (map units); `scale` = its true-area square as a multiple of a grid square. Start with the name; every square must answer differently. |
| `missingDetail(t)` | Required when a row has `value: null`: the same, for a hollow square. |
| `missingLabel` | The legend's word for a country with no value. |
| `callout(c)` | The sentence under the plate. `c` is `{ biggest: { name, value, areaShare }, missing, byCountry, byArea }` — the country covering most of a choropleth, how many squares are hollow. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a square is, the scope, the limits the journalist named. |
| `reading` | The reading line: give back the place, then the area, and watch the mean. |
| `source` | The credit line, exactly as the storyboard records it. |
| `alt` | The alt text — a string, or `(a) => string` with `a = { tiles, byCountry, byArea, biggest }`. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(map)` | Throws if the data no longer supports the title. `map` is `{ byCountry, byArea, gap, biggest: { iso, name, value, areaShare }, value(iso), ranked }`. |

## Reading the data

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, VALUE] = [col("iso3"), col("share")];
const rows = table.rows.map((r) => ({ iso: r[CODE], name: SHORT[r[CODE]], value: r[VALUE] === null || r[VALUE] === "" ? null : Number(r[VALUE]) }));
```

Keep ONE row per country. Country names without codes: `import { iso3Of } from "./countries.mjs"`.

## Rules

- A cartogram's argument is that ink follows territory on a choropleth: draw a rate or a share, never
  a raw count.
- `check()` tests only what the drawn data can decide; compare at the takeaway's precision
  (`Math.round(byArea) === 45`). A figure the data cannot confirm stays in the title and is not checked.
- Every number in a sentence is computed from `data.json` or taken from the reading the render hands
  you (`s`, `t`, `c`), never typed — except the title, which is the journalist's own sentence, copied
  as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. If the
  render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a
  small `edit_file`, render and look again.
