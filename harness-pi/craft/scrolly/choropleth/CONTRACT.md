# Choropleth (scrolly) — what you write

The page is already designed: it comes from the worked example `proof/scrolly-choropleth-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE, flat MapTiler map of Europe — every country
a fill over MapTiler's own country tiles — that stays fixed while six cards of prose travel up over
it; the reader's scroll moves the camera and every colour continuously from one card's state to the
next. Under the live map lies one frozen picture per card, baked from the same map, which is what a
reader without a script or a network sees. The ramp, the camera, the key, the names' placement and the
CHOREOGRAPHY are done:

| card | what the picture does | your words for it |
|---|---|---|
| 1 | Europe, empty: sea and land only | `cards.countries` |
| 2 | the classes arrive one by one, lowest first, with the key under the map | `cards.classes` |
| 3 | every country under the top class steps back to bare land; the header counts the rest | `cards.floor`, `counter` |
| 4 | the `named` countries are named on the map | `cards.named` |
| 5 | the camera travels onto `subject`: ringed, named with its value; its neighbours named with theirs | `cards.subject` |
| 6 | back to Europe, every class, the named countries and the subject ringed | `limits` |

The subject's neighbours are derived from the shapes (countries whose borders touch it and that carry
a value). A country with no value keeps the key's neutral fill and no word on the map. With
JavaScript off the page shows card 6's picture, the key and the counter, and every card's words.
You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's cards. `render-beat.mjs` (already in the folder) computes every
figure, checks your words against them, bakes the card pictures from the live map, checks the page
in a real browser and prints `look at: <png>` (card 1), with one PNG per card in `renders/`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** The camera holds Europe from 25° W to 42° E and 34° N to 68° N, and the shapes are
64 countries keyed by ISO 3166 alpha-3 (`FRA`, `DEU`, `GBR`…). A country outside them cannot be
drawn; Kosovo and Northern Cyprus have no code. Russia and Turkey are drawn only in part. If the story
is not about European countries, this kit cannot draw it — say so.

## The reading `r`

Every word function receives `r`, computed by the render from your `rows` and `breaks`:

| Field | What it is |
|---|---|
| `r.count` | how many countries carry a value |
| `r.rowCount` | how many rows (with and without a value) |
| `r.breaks`, `r.lowestBreak`, `r.floor` | your class limits; the first one; the last one (the top class opens there) |
| `r.classCount`, `r.classCounts` | how many classes (`breaks.length + 1`); how many countries in each, lightest first |
| `r.top`, `r.topCount` | the countries in the top class, `[{ iso, name, value }]`, largest first; how many (card 3 keeps them) |
| `r.named`, `r.namedCount` | your `named` countries, `[{ iso, name, value }]`, in your order; how many |
| `r.subject` | `{ iso, name, value, rank }` — rank 1 = the highest value |
| `r.neighbours`, `r.neighbourCount`, `r.neighbourMax` | the subject's neighbours with a value, largest first; how many; the largest of their values |
| `r.neighbourCeiling` | your `neighbourCeiling`, or `null` |
| `r.missing`, `r.missingCount` | the rows with no value, `[{ iso, name }]`; how many |
| `r.highest`, `r.lowest`, `r.ranked` | the highest and lowest country, and every country with a value, largest first |
| `r.value(iso)` | a country's value, or `null` |
| `r.seatOf(iso)` | where its name sits, `[lon, lat]` (lon grows east, lat grows north) |
| `r.neighboursOf(iso)` | the `iso` codes of the countries bordering it that carry a value |

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | THE JOIN. One `{ iso, name, value }` per country the source is supposed to report. `iso` is the ISO alpha-3 code; `name` is the country's name in the story's language; `value` is the number the map is shaded by, or `null` for a country the source does not report (the key's neutral, never the lowest class). |
| `breaks` | 2 to 5 rising numbers, the class limits (3 to 6 classes). The takeaway's own threshold is the LAST one ("above 94 %" → `[40, 55, 70, 85, 94]`): card 3 keeps only the top class. |
| `named` | The `iso` codes card 4 names on the map, every one IN THE TOP CLASS (their ink is measured on its fill). At most 12; `[]` if the title names none. Not the subject. |
| `subject` | The `iso` of the one country card 5 travels onto. It must carry a value and border at least one country with a value. |
| `neighbourCeiling` | Optional: a round number every neighbour of the subject stays under, when a card says so ("its neighbours are all under 60 %"). The render checks it on the shapes; a card may then print it. |
| `unit` | What the colour is, printed beside the key ("share of low-carbon generation"). |
| `missingLabel` | The key's word for a country with no value ("no data"). |
| `format(v)` | How a value or a class limit is printed ("94 %"), in the story's language. The names on card 5 print `name · format(value)`. |
| `counter(r)` | The header count shown from card 3: a short phrase holding `{n}` once, which the page counts up to `r.topCount` ("{n} countries above 94 %"). |
| `seas` | Optional sea names in the story's language: `{ northSea, mediterranean, baltic }`. Leave out what you do not want named. |
| `cards` | `{ countries(r), classes(r), floor(r), named(r), subject(r) }` — the prose of cards 1 to 5, each a sentence (or an array of paragraphs). Card 1 must state `r.count`; card 2 `format(r.lowestBreak)` and `format(r.floor)`; card 3 `format(r.floor)`; card 4 every name of `r.named`; card 5 `r.subject.name` and `r.neighbourCount`. |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). It may be an array — the takeaway first, then shorter forms for a phone. |
| `limits` | Card 6, a string: what the map counts and leaves out — the limits the journalist named, the countries with no value, the countries drawn only in part. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text describing the map (a string, or a function of `r`). |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `check(r)` | Throws if the data no longer supports the title (it receives `r`). |

The render refuses, saying what to change, when: a row's code matches no country (or MapTiler serves
no polygon for it); a country lies outside the camera; no country, or every country, reaches the top
class; a `named` country is not in the top class; the subject has no value or no neighbour with one;
a neighbour is not under `neighbourCeiling`; a card does not state what its picture shows; or a card,
the counter or the alt states a number no figure of `r` rounds to.

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
`rename` only as a visible decision — say so in `limits`.

## Rules

- Shade by a rate or a share, never by a raw count: a big country with a big count would look like
  the argument. If the takeaway is per resident, compute it from the columns.
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the limits — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- The join fails loud: a code that matches no country refuses the render, by name. Fix the code; never
  drop a row silently. A country the source does not report is `value: null`, not `0`.

- Every number in a card, the counter or the alt is taken from `r` (through `format()` for values), never typed — except the title, which is the journalist's own sentence, copied as written. A year is fine.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `scrolly`, then `look` at the PNG it names
  (card 1) and at the other cards' PNGs. The first render bakes six pictures of the live map in two
  shapes (a few minutes; later renders reuse them while the map is unchanged). If the render refuses,
  read its message and fix `beat.mjs`. If a picture is wrong (a name missing, the wrong country
  ringed, a card cut), fix `beat.mjs` with a small `edit_file`, render and look again.
