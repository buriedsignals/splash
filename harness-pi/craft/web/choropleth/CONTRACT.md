# Choropleth (web) — what you write

The page is already designed: it comes from the worked example `proof/web-choropleth-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map — every country a MapLibre fill
over MapTiler's own country tiles, which the reader can zoom and drag — over a frozen picture of that
same map that stands with JavaScript off. The INTERACTION is done: ONE control lets the reader pick the
rule that cuts the values into classes — the breaks the story states, quantiles, equal intervals,
Fisher-Jenks natural breaks — because what a choropleth hides is that the cut was a choice. The legend's
limits and counts, a sentence under the control, the map's colours and the value table's swatches all
follow the rule. Hovering or tapping a country answers its own reading. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's page. `render-beat.mjs` (already in the folder) computes every
rule, every count, every country's reading and what Web Mercator costs this map, draws the page,
checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** The camera holds Europe and its neighbours, and the shapes are 64 countries keyed by
ISO 3166 alpha-3 (`FRA`, `DEU`, `GBR`…). A country outside them cannot be drawn; Kosovo and Northern
Cyprus have no code. Russia (and any country reaching far outside Europe) is drawn only in part. If the
story is not about European countries, this kit cannot draw it — say so.

**At most four classes, and fewer on a pale accent.** Neighbouring classes must stand 1.2:1 apart over
the basemap's land. The render measures how many classes the story's accent carries and, if `breaks`
asks for more, refuses saying how many numbers `breaks` may hold.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | THE JOIN. One `{ iso, name, value }` per country the source is supposed to report. `iso` is the ISO alpha-3 code; `name` is the country's name in the story's language; `value` is the number the map is shaded by, or `null` for a country the source does not report (drawn hollow, in no class). A row may carry more fields (e.g. the two columns a share is computed from): `detail()` receives them. |
| `breaks` | 1 to 3 rising numbers: the class limits the STORY states. The takeaway's own threshold is one of them ("above 94 %" → `94`). The map opens on this rule. |
| `format(v)` | How a value or a class limit is printed ("94,0 %"), in the story's language. |
| `bound(c)` | One legend chip. `c` is `{ index, lower, upper, count }`: `lower` is `null` for the lightest class, `upper` is `null` for the darkest. Must print `format(lower)`, `format(upper)` (when not null) and `count` (how many countries the class holds). |
| `ruleLabel` | The control's name ("Classing rule"). |
| `rules` | The four rules' words: `{ stated: { label, announce }, quantiles: { label, announce, note(r) }, equal: { label, announce, note(r) }, jenks: { label, announce, note(r) } }`. `label` is the short button word; `announce` is what a screen reader hears and must CONTAIN `label`. `note(r)` is the sentence shown under the control when that rule is chosen (see below). |
| `detail(r)` | The tooltip sentence for one country with a value. `r` is the row plus `{ rank, of, classesSeen, sameUnderAll, rules, classes }`: `rank` = 1 for the highest value, `of` = how many countries have a value, `classesSeen` = the class numbers (1 = lightest) the country lands in across the four rules, `sameUnderAll` = true when that is one class. Start with the country's name; never name the class it is in (that changes with the rule — the colour says it). |
| `missingDetail(r)` | Required only when a row has `value: null`: the tooltip for that country (the row with `name`). |
| `missingLabel` | The legend's word for a country with no value ("no data"). |
| `callout` | The sentence under the map: the countries the title is about, and how no-data is drawn. Numbers computed. |
| `hint` | One sentence shown only once the live map is up: wheel or buttons to zoom, drag to move, hover a country for its reading. |
| `reading` | A reading line: what the colour is, and that the rule can be changed. |
| `tableCaption` | The caption of the value table under the map ("The 40 readings, and the class the chosen rule gives them"). |
| `columns` | The table's four headings: country, value, rank, class. |
| `mercator(m)` | The sentence that says what the flat map costs THIS story — appended to `limits` in the standfirst. `m` is `{ names, pageShare, trueShare, setAside }`: `names` = the three countries Web Mercator inflates most (or the ones you list in `inflated`), `pageShare` / `trueShare` = the percent of the drawn land they cover on the page / on the ground (print both, rounded), `setAside` = names of countries drawn only in part and left out of that measure. |
| `inflated` | Optional: three `iso` codes the Mercator sentence should name (e.g. the northernmost). Leave out and the kit picks the three most inflated. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what the value is, the year, the scope, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text: what the map shows, with its computed numbers. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(map)` | Throws if the data no longer supports the title. It receives helpers about the DRAWN map: `map.value(iso)` (the value or `null`), `map.ranked` (`[{ iso, name, value }]`, largest first), `map.rule(key)` — `key` is `"stated"`, `"quantiles"`, `"equal"` or `"jenks"` — which returns that rule's reading (below). |

### The reading of one rule (`r` in `note(r)`, and `map.rule(key)`)

`{ key, classes, total, breaks, counts, opensAt, top, statedTop, newcomers, moved, step }`:
`classes` = how many classes; `total` = how many countries have a value; `breaks` = the rule's limits;
`counts` = how many countries per class, lightest first; `opensAt` = the darkest class's lower limit;
`top` = `[{ iso, name, value }]` in the darkest class; `statedTop` = the same under the stated breaks;
`newcomers` = countries in the darkest class now that are not in it under the stated breaks; `moved` =
how many countries change class against the stated breaks; `step` = for `equal`, the width of one class
(else `null`). A note must state `r.top.length` and `r.moved`, and every number it prints must come
from `r`.

## Reading the data

Find columns by name, never by position:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, NAME, VALUE] = [col("iso3"), col("country"), col("rate")];
const rows = table.rows.map((r) => ({ iso: r[CODE], name: r[NAME], value: r[VALUE] === null || r[VALUE] === "" ? null : Number(r[VALUE]) }));
```

Keep ONE row per country (filter to one year or one series first). When the table names countries but
holds no ISO alpha-3 column, resolve them with `countries.mjs` (in the folder):

```js
import { iso3Of } from "./countries.mjs";
const codes = iso3Of(table.rows.map((r) => r[NAME]), import.meta.dirname, { /* "Belgiumm": "Belgium" */ });
```

It refuses, all at once, every name it cannot place, with the closest name. A misspelling is fixed in
`rename` only as a visible decision — say so in the standfirst.

## Rules

- Shade by a rate or a share, never by a raw count: a big country with a big count would look like
  the argument. If the takeaway is per resident, compute it from the columns.
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- The join fails loud: a code that matches no country refuses the render, by name. Fix the code; never
  drop a row silently. A country the source does not report is `value: null`, not `0`.

- Every number in a sentence is computed from `data.json` or taken from the reading the render hands you (`r`, `m`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. The first
  render bakes the basemap and photographs the live map (about a minute; later renders reuse both while
  the map's colours are unchanged). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
