# Choropleth (video) — what you write

The video is already designed: it comes from the worked example `proof/video-choropleth-europe-lowcarbon`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map of Europe (every country a fill
over MapTiler's own country tiles) under a few words, 19.3 s at 30 fps. It opens on a title card (eyebrow
+ title); then the classes arrive on the map, lowest first, with the count of reporting countries and
the key; then THE FLOOR RISES — a cursor travels the key borne by borne, each class it passes steps
back to bare land and the count steps down — until only the top class stands, and the map names those
countries; then the camera closes in on the SUBJECT, ringed, and its share and each neighbour's share
count up on gauges with the floor notched on them — the subject crosses the notch, its neighbours stop
short; a neighbour with no data is named "no data"; then the camera pulls back to the whole map, the
credit on the sea. There is no standfirst and no sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
rows and the WORDS of this story's video. `render-beat.mjs` (already in the folder) cuts the classes,
counts every step, finds the subject's neighbours on the map, measures the live map, places every word,
renders nine stills, prints `look at: <png>`, then renders the mp4 (about eight minutes; a re-render with
the same data and words reuses the map's measurement).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** The camera holds Europe (25°W–42°E, 34°N–68°N), and the shapes are 64 countries keyed by
ISO 3166 alpha-3 (`FRA`, `DEU`, `GBR`…). Kosovo and Northern Cyprus have no code and cannot carry a
row (the map names Kosovo "no data" when it borders the subject).

**This video tells ONE argument: an exception.** The subject stands in the top class while every
neighbour it shares a border with stays under the floor. It refuses, saying so, when:
- the subject is under the last break (it names the countries that are above it);
- a neighbour of the subject is above the last break too;
- the subject has no neighbour with a value (an island), or more than five neighbours on the map;
- a close-up name finds no readable place beside its seat (it names the name).
A story that is not an exception is told in the static or web format.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `rows` | THE JOIN. One `{ iso, name, value }` per country the source is supposed to report. `iso` is the ISO alpha-3 code; `name` is the country's name in the story's language; `value` is the number the map is shaded by, or `null` for a country the source does not report (drawn in the "no data" fill, in no class). |
| `breaks` | 2 to 5 rising numbers: the bornes the floor climbs, one per step. The LAST is the takeaway's threshold ("above 94 %" → `94`); the top class is every value at or above it. |
| `subject` | The `iso` of the exception — a country in the top class whose neighbours are all under it. The close-up is centred on it. |
| `unit` | The unit printed after every share and borne, short ("%", "t"); `""` for none. Shares at the close-up are printed as whole numbers. |
| `scaleMax` | Optional: the gauges' full width (default 100, for a share in %). Every close-up value and the last break must lie between 0 and it. |
| `count(n)` | The counter's words for `n` countries ("7 pays", "7 countries"). Must print `n`. |
| `missingLabel` | The key's word for a country with no value ("no data"). |
| `noData(name)` | The close-up's line for a neighbour with no value ("Kosovo, no data"). Must print `name`. |
| `waters` | Optional: the sea names the map prints, in the story's language, by these keys only: `{ northSea, mediterranean, baltic }`. Leave one out and it is not printed. |
| `source` | The credit in one to three forms, longest first, exactly as the storyboard records it; EVERY form must carry "© MapTiler © OpenStreetMap" (the basemap's attribution). The render sets the longest form that fits the open sea on one line. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. Names are printed in capitals in this language. |
| `check(map)` | Throws if the data no longer supports the title. It receives the DRAWN map (below). |

### What `check(map)` receives

`map.value(iso)` (the value or `null`); `map.ranked` (`[{ iso, name, value }]`, largest first);
`map.above` (the top class, largest first); `map.counts` (how many countries per class, lowest class
first); `map.subject` (`{ iso, name, value }`); `map.neighbours` (the subject's neighbours with a
value, `[{ iso, name, value }]`); `map.unmeasured` (its neighbours without one, `[{ name }]`);
`map.seat(iso)` (`[lon, lat]`, where the map names the country — for "north or west of" claims).

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

It refuses, all at once, every name it cannot place, with the closest name.

## Rules

- Shade by a rate or a share, never by a raw count: a big country with a big count would look like
  the argument. If the takeaway is per resident, compute it from the columns.
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- The join fails loud: a code that matches no country refuses the render, by name. Fix the code; never
  drop a row silently. A country the source does not report is `value: null`, not `0`.

- Every number is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: the whole map, the top class named, the subject ringed). If the render refuses, read its
  message and fix `beat.mjs`. If the picture is wrong (a name cut, the wrong subject, a wrong count),
  fix `beat.mjs` with a small `edit_file`, render and look again.
