# Contour / isoline (web) — what you write

The page is already designed: it comes from the worked example `proof/web-contour-europe-distance`
and the story's PALETTE.md and DIRECTION.md. It is a LIVE MapTiler map — the field's bands, its
isolines and each line's own printed number are MapLibre layers over MapTiler's tiles, which the reader
can zoom and drag — over a frozen picture of that same map that stands with JavaScript off. The
INTERACTION is done: ONE control lets the reader choose the STEP between the lines (50, 100, 200 or
400 km; the map opens on 100), because the step is the one decision a contour map hides. Choosing a
step re-cuts the bands, keeps only that step's lines, re-colours the chip row, shows that step's
sentence and dims the table rows the step does not draw. Hovering the land lights the WHOLE band the
chosen step puts that point in and answers: the country · the measured distance · the band. You do
not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it, measures the field
with `field.mjs` and exports the WORDS of this story's page. `render-beat.mjs` (already in the folder)
draws the bands and lines, computes every reading and what Web Mercator costs this map, draws the
page, checks it in a real browser and prints `look at: <png>`.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What this kit can draw — and what it cannot

It draws ONE field: **distance to the sea, over European countries** (measuring frame 25°W–45°E,
34°N–72°N). The field is computed from the coastline in `shapes.geojson`, which is complete by
construction; the story chooses the STUDY AREA — which countries the claim is measured over — by
ISO-3 code from `data.json`.

It cannot draw elevation, temperature, rainfall, travel time, or a distance to the nearest record
(station, hospital, school): no such field arrives in a story folder, and a field built from records
lies wherever a record is missing. If the takeaway is about such a field, this is not the kit for it:
say so instead of writing a beat.

## The field

```js
import { measureSeaDistance } from "./field.mjs";
const field = measureSeaDistance(import.meta.dirname, { study }); // study = ISO-3 codes from data.json
```

`field` gives every number a sentence may state: `field.median` (km; half the study land is nearer the
sea), `field.deepest` (km; the farthest point), `field.deepestIso` (its country's ISO-3),
`field.within(km)` (percent of the study land within `km`), `field.quantile(p)`, `field.levels` (every
line the page can draw, multiples of 50 km), `field.steps` (`[50, 100, 200, 400]`),
`field.defaultStep` (100), `field.topKm` (the ramp's top), `field.binKm` (25: the field is binned once
at this quantum), `field.cellKm` (the mesh, about 7 km), `field.scaleErrorPc` (3),
`field.errorKm` (the scale error at the farthest point, km), `field.cells`, `field.study` (codes
measured), `field.offFrame` (study countries with islands outside the frame — not measured).

It refuses, by name: a code the shapes do not carry (use ISO-3, `FRA` not `FR` or `France`), a code
twice, a country the frame CUTS (Russia: leave it out of `study` and say so in `limitNote`), a
country wholly outside the frame, and a study area too shallow for two isolines.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `field` | `measureSeaDistance(import.meta.dirname, { study })`, as above. |
| `names` | `{ ISO3: name }` for EVERY study country, in the story's language — a pointer answers with it. |
| `stepLabel(km)` | The pill's word for a step: `(km) => \`${km} km\``. Must print `km`. |
| `stepAnnounce(km)` | What a screen reader hears for that pill; must CONTAIN `stepLabel(km)`. |
| `stepNote(s)` | The sentence under the control when step `s` is chosen: what this step costs. `s` is `{ km, classes, drawn, half, finest, coarsest, isDefault, cellKm, errorKm, median, withinStep, topKm }`: `classes` = how many bands, `drawn` = how many lines it draws, `half` = half the step (how far a point is undetermined inside its band), `finest`/`coarsest` = true for 50 / 400, `errorKm` = the camera's scale error at the farthest point, `median` = the field's median, `withinStep` = percent of the land within one step. Must state `s.classes` and `s.drawn`; every number it prints must come from `s`. |
| `bandDetail(b)` | The band part of the answer, `b` = `{ lower, upper, step }`: "the band 100–200 km at the 100 km step". Must print all three. |
| `binDetail(b)` | The measured part of the answer, `b` = `{ lower, upper }` (a 25 km bin): "25–50 km from the sea". Must print both. |
| `levelDetail(l)` | A table row's detail, `l` = `{ level, areaKm2, beyondPc, drawnBy }`: `areaKm2` = land farther from the sea than that line, `beyondPc` = the same as a percent, `drawnBy` = the steps that draw it. Must print `level` and `areaKm2` (rounded). |
| `percent(v)` | How the table prints a share of land ("12.3 %"). |
| `stepLegend` | The control's name ("Interval between two lines"). |
| `nearLabel` | The ramp's light end ("the sea"). |
| `farLabel(top)` | The ramp's dark end; must print `top` (km). |
| `tableCaption({ levels })` | The caption of the table of lines; a number it prints is `levels`. |
| `columns` | The table's two headings: the line (km), the land beyond it. |
| `claimNote` | The sentence under the map: median, share within a distance, the farthest point and its country — computed from `field`. |
| `limitNote` | The study area, what is left out and why, the mesh — computed from `field`. |
| `mercator(m)` | The sentence that says what the flat map costs THIS story — appended to `limits`. `m` is `{ names, pageShare, trueShare, factor }`: `names` = the four countries Web Mercator inflates most (or those in `inflated`), `pageShare` / `trueShare` = the percent of the drawn land they cover on the page / measured. Print both. Say the distances are measured on an equal-area grid, so no number moves. |
| `inflated` | Optional: ISO-3 codes the Mercator sentence names (e.g. the northernmost). |
| `reading` | A reading line: the step is a choice; choose it, then hover the land. |
| `hint` | One sentence shown once the live map is up: wheel or buttons to zoom, drag to move, hover for the reading. |
| `smallestLabel` | Optional: the words for "one painted cell" in the story's language (the map's zoom ceiling). |
| `title` | The headline: the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it). |
| `limits` | The standfirst: what a line joins, the limits the journalist named. |
| `source` | The credit line, exactly as the storyboard records it; keep "MapTiler" in it. |
| `alt` | The alt text: what the map shows, with its computed numbers. |
| `lang` | Optional: the page's language tag. Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | 3. |
| `check(field)` | Throws if the field no longer supports the title. |

`claimNote`, `limitNote` and `alt` may print only numbers the field holds (its median, farthest point,
mesh, bin, scale error, the study's size, levels, steps, band counts, `within()` of a level or step).

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Find the ISO-3 column by
name, never by position, and take its cells as `study`:

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const CODE = table.columns.findIndex((c) => c.name === "iso3");
const study = table.rows.map((r) => r[CODE]).filter((code) => code !== "RUS");
```

If the data has country NAMES only, resolve them with `countries.mjs` (in the folder):
`iso3Of(names, import.meta.dirname, { /* "Belgiumm": "Belgium" */ })` — it refuses, all at once, every
name it cannot place.

## Rules

- `check()` tests only what the field can decide. A figure the field cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(field.median) === 133`), never with strict equality on the raw value.
- The title's figures must be the field's own (its median, its farthest point, a drawn level, a step, a quantile, or `within()` of one): the render refuses a headline whose numbers the field does not hold.
- Every number in a sentence is computed from `field` or taken from the reading the render hands you (`s`, `b`, `l`, `m`), never typed — except the title, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name in a sentence.
- After `write_file`, call `render_beat` with format `web`, then `look` at the PNG it names. The first
  render bakes the basemap and photographs the live map (about two minutes; later renders reuse both
  while the map's colours and field are unchanged). If the render refuses, read its message and fix
  `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
