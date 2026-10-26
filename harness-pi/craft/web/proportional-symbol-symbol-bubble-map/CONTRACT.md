# Proportional symbol (web) — what you write

The page is already designed: it comes from the worked example
`proof/web-proportional-symbol-europe-capacity` and the story's PALETTE.md and DIRECTION.md. It is a
LIVE MapTiler map the reader can zoom and drag — the countries drawn as neutral ground, one
translucent circle per place, its AREA the value, held at the same screen size at every zoom (one
value never means two sizes), with a size legend — over a frozen picture of that map that stands with
JavaScript off. The INTERACTION is done: ONE control lets the reader pick the LAW that turns a value
into a circle (area proportional — the honest one, the default; radius proportional — the one that
lies; flattened), because the spread between the circles is the one setting a symbol map never shows.
Every circle and the legend re-scale; a sentence under the control prints the area ratio the law SHOWS
between the largest place and the median one, their TRUE ratio, and how many places the law shrinks
below legibility. Hovering or tapping a circle answers its reading. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
places and the WORDS. `render-beat.mjs` (already in the folder) computes the three laws, every radius,
the legend's magnitudes, the camera, the zoom limit and what Web Mercator costs this map, draws the
page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** The camera holds Europe and its neighbours (about 25°W to 42°E, 34°N to 68°N, wider
in longitude on a wide screen). Each place names the country it is in by ISO alpha-3 code (`FRA`,
`DEU`…), from the kit's 64 countries — that is what the Mercator sentence measures.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `symbols` | One circle per place: `{ iso, name, value, lon, lat, … }`. `iso` = the ISO alpha-3 code of the country the place is in; `name` = what the map, the table and the tooltip print (unique); `value` = the positive quantity the circle's AREA draws; `lon`/`lat` = where the circle sits, from data.json (for a country, the value-weighted centre of its own sites is better than its centroid). Extra fields ride along to `detail()`. |
| `labelled` | The names (as in `symbols`) of at most 6 places the title is about — labelled on the map. Each must be large enough to hold its label (the render refuses a small one). |
| `figure(v)` | How a value is printed short, on labels, the legend and the table ("96 GW"). |
| `number(v, d)` | How a number is printed with `d` decimals in the story's language (`v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })`). The notes' ratios are checked in this format. |
| `detail(s)` | The tooltip for one place. `s` is its symbol plus `{ rank, of, share, total }`: `share` = its value as a percent of the total. Start with its name; every place must answer differently. |
| `lawLabel` | The control's name ("The area scale"). |
| `laws` | The three laws' words: `{ area: { label, announce }, radius: { label, announce, note(f) }, flat: { label, announce, note(f) } }`. `announce` must CONTAIN `label`. `note(f)`: `f` is `{ shown, truth, erased, total, subject, reference }` — `shown` = how many times bigger the largest place's circle AREA is drawn than the median place's under that law, `truth` = how many times bigger its value really is, `erased` = how many places that law draws too small to read, `total` = how many places, `subject`/`reference` = the two names. A note must print `number(shown, 1)` and `number(truth, 1)`, and `number(erased, 0)` when `erased` > 0. |
| `callout(c)` | The sentence under the map (the claim's places and figures). `c` is `{ ranked, total }`: places largest first, and the total value. |
| `mercator(m)` | What the flat map costs THIS story — appended to `limits`. `m` is `{ names, pageShare, trueShare, setAside }`: on a symbol map the circles are exact and the LAND under them is inflated; `names` = the three countries Mercator inflates most (or the ones in `inflated`), `pageShare` / `trueShare` = the percent of the drawn land they cover on the page / on the ground (print both, rounded), `setAside` = countries left out of the measure (drawn only in part, e.g. Russia). |
| `inflated` | Optional: three `iso` codes the Mercator sentence should name. Leave out and the kit picks the three most inflated. |
| `countryNames` | Optional: `{ ISO3: "name in the story's language" }` for the countries `mercator` names (default: English). |
| `hint` | One sentence about moving the map: drag, zoom, keyboard; circles keep their size. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a circle is, the scope, the limits the journalist named. |
| `reading` | The reading line: the exponent is the one setting a symbol map hides; with no script the table follows the law. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text — a string, or `(a) => string` with `a = { ranked, total }`. |
| `tableCaption` | The table's caption — a string, or `(t) => string` with `t = { places, rowScale }` (`rowScale` = the percent of the map's scale the table's swatches are drawn at). |
| `columns` | The table's three headings: place, value, rank. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(map)` | Throws if the data no longer supports the title. `map.ranked` = `[{ name, iso, value }]` largest first, `map.total`, `map.value(name)`. |

## Reading the data

Read data.json by column name; aggregate to one row per place when the table holds sites:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [PLACE, AMOUNT, LON, LAT] = ["country", "amount", "lon", "lat"].map(col);
// sum AMOUNT per PLACE; seat each circle at the amount-weighted mean of its sites' LON/LAT
```

Country names to ISO codes: `import { iso3Of } from "./countries.mjs"` and
`iso3Of(names, import.meta.dirname, { /* "Belgiumm": "Belgium" */ })` — it refuses, all at once, every
name it cannot place.

## Rules

- The circle's AREA is the value: shade nothing, size nothing else. Draw counts or amounts (a symbol
  map's honest quantity), never a rate.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm stays in the
  title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision
  (`Math.round(v) === 55`), never with strict equality.
- Every number in a sentence is computed from `data.json` or taken from the reading the render hands
  you (`f`, `m`, `c`), never typed — except the title, which is the journalist's own sentence, copied
  as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. The first
  render bakes the basemap and photographs the live map (about a minute). If the render refuses, read
  its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`,
  render and look again.
