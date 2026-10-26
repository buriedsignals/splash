# Choropleth — what you write

The map is already done: the shapes (`shapes.geojson`), the camera, the MapTiler basemap plate (baked
by `bake.mjs` on the first render), the class scale, the colour ramp, the word placement, the type and
the layout come from the worked example `proof/static-choropleth-europe-lowcarbon`, `PALETTE.md` and
`DIRECTION.md`. You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and
exports what THIS story's plate says. `render-beat.mjs` (already in the folder) draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

**Europe only.** The camera holds Europe and its neighbours, and the shapes are 64 countries keyed by
ISO 3166 alpha-3 (`FRA`, `DEU`, `GBR`…). A country outside them cannot be drawn; Kosovo and Northern
Cyprus have no code. If the story is not about European countries, this kit cannot draw it — say so.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `rows` | THE JOIN. One `{ iso, name, value }` per country the source is supposed to report. `iso` is read from the data column that holds ISO alpha-3 codes; `name` is the country's name in the story's language; `value` is the number the map is shaded by, or `null` for a country the source does not report (it is drawn as "no data", never as the lowest class). |
| `breaks` | Optional. 2 to 6 rising numbers, the class limits. Use the takeaway's own threshold as one of them ("above 94 %" → `94`). Leave it out and the kit derives round steps from the values. |
| `named` | The `iso` codes of the countries the title is about; they are named on the map in the strongest ink. At most 12. `[]` if the title names none. |
| `subject` | The `iso` of the one country the callout is about; it is ringed in the accent. |
| `callout` | The sentence beside the key about `subject`, in forms, longest first. Its numbers are computed. |
| `seas` | Optional sea names in the story's language, forms longest first: `{ northSea: [...], mediterranean: [...], baltic: [...] }`. Leave out what you do not want named. |
| `unit` | What the colour is, printed over the key ("share of low-carbon generation"). |
| `missingLabel` | The key's word for a country with no value ("no data"). |
| `format(v)` | How a class limit is printed ("94 %"), in the story's language. |
| `title` | The headline in forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what the value is, the year, the scope, the limits the journalist named. |
| `reading` | A reading line in forms, longest first ("Reading: colour is a class, its limits are under the map."). |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text: what the map shows, with its computed numbers. |
| `evidenceLevels` | The number of classes. |
| `check(map)` | Throws if the data no longer supports the title. It receives helpers about the DRAWN map: `map.value(iso)` (the value or `null`), `map.ranked` (`[{ iso, name, value }]`, largest first), `map.neighboursOf(iso)` (bordering countries that carry a value, derived from the shapes), `map.anchorOf(iso)` (`{ x, y }` in the map, x grows east, y grows south). |

## Reading the data

Find columns by name, never by position:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, NAME, VALUE] = [col("iso3"), col("country"), col("rate")];
const rows = table.rows.map((r) => ({ iso: r[CODE], name: r[NAME], value: r[VALUE] === null || r[VALUE] === "" ? null : Number(r[VALUE]) }));
```

Keep ONE row per country (filter to one year or one series first). If the table holds country names
but no ISO alpha-3 column, map names to codes in `beat.mjs` and check every row got one.

## Rules

- Shade by a rate or a share, never by a raw count: a big country with a big count would look like
  the argument. If the takeaway is per resident, compute it from the columns.
- A rate per resident is drawn per 1,000, 10,000 or 100,000 residents (whichever gives whole-number values), with that base said in the unit or the standfirst — never as 0.0039.
- `check()` tests only what the drawn data can decide. A figure the data cannot confirm — one from another source, or one the journalist's limits call preliminary — stays in the title as the journalist wrote it and is not checked.
- Draw the measure the takeaway is about. If it speaks of a rate, a share or a ranking per resident / per capita, compute that measure from the columns and draw it — never the raw column beside a per-resident headline.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(v) === 233`, or to one decimal), never with strict equality on the raw division.
- The join fails loud: a code that matches no shape refuses the render, by name. Fix the code; never
  drop a row silently. A country the source does not report is `value: null`, not `0`.

- Every number in a sentence is computed from `data.json`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. The first render
  bakes the basemap (a few seconds). If the render refuses, read its message and fix `beat.mjs`. If the
  picture is wrong (wrong country ringed, a class empty, a name missing), fix `beat.mjs` with a small
  `edit_file`, render and look again.
