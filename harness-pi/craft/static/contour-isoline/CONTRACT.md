# Contour / isoline — what you write

The field, the isolines, their labels, the summit mark, the basemap plate, the type, the colours and
the layout are already done: they come from the worked example `proof/static-contour-europe-distance`
and the story's PALETTE.md and DIRECTION.md. You write ONE file, `beat.mjs`, in the beat folder. It
reads `data.json` beside it and exports what THIS story's plate says. `render-beat.mjs` (already in
the folder) bakes the plate and draws it.

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What this kit can draw — and what it cannot

It draws ONE field: **distance to the sea, over European countries** (frame 25°W–45°E, 34°N–72°N).
The field is computed from the coastline in `shapes.geojson`, which is complete by construction; the
story chooses the STUDY AREA — which countries the field is measured over — by ISO-3 code from
`data.json`.

It cannot draw elevation, temperature, rainfall, travel time, or a distance to the nearest record
(station, hospital, school): no such field arrives in a story folder, and a field built from records
lies wherever a record is missing (the type sheet's `no-build-field-records`). If the takeaway is
about such a field, this is not the kit for it: say so instead of writing a beat.

## The field

```js
import { measureSeaDistance } from "./field.mjs";
const field = measureSeaDistance(import.meta.dirname, { study }); // study = ISO-3 codes from data.json
```

`field` gives every number a sentence may state: `field.median` (km; half the study land is nearer the
sea), `field.deepest` (km; the farthest point), `field.deepestIso` (ISO-3 of the country it is in),
`field.within(km)` (percent of the study land within `km`), `field.quantile(p)`, `field.levels` (the
lines drawn, km), `field.cellKm` (grid, 6), `field.study` (codes measured), `field.offFrame` (study
countries with islands outside the frame — Svalbard, Azores, Canaries — not measured).

It refuses, by name: a code the shapes do not carry (the join fails loud — use ISO-3, `FRA` not `FR`
or `France`), a code twice, a country the frame CUTS (Russia: leave it out of `study` and say so in
`limitNote`), a country wholly outside the frame, and a study area too shallow for two isolines.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric above the title, two to four words, in the story's language. |
| `field` | `measureSeaDistance(import.meta.dirname, { study })`, as above. |
| `unit` | The caption over the map: what the lines measure ("distance to the sea, in kilometres"). |
| `limitNote` | One short sentence under the caption: what is not measured (a country left out, islands off the frame). |
| `levelLabel(level)` | The label printed ON each line, with its unit, in the story's language: `(l) => \`${l} km\``. |
| `summitLabel` | The label on the farthest point: `field.deepest` rounded, with its unit — computed, never typed. |
| `title` | The headline in two or three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `limits` | The standfirst, in forms, longest first: what a line joins, the grid, the study area, the limits the journalist named. |
| `reading` | One or two "how to read" sentences, longest first (dropped first when space runs out). |
| `source` | The credit line, exactly as the storyboard records it (the basemap is MapTiler). |
| `alt` | The alt text describing the field (a string, or a function of `field`). |
| `evidenceLevels` | 3. |
| `check()` | Throws if the field no longer supports the title. |

## Reading the data

`data.json` is `{ columns: [{ name, type }], rows: [[…]] }`; rows are arrays. Find the ISO-3 column by
name and take its cells as `study`. If the data has country NAMES only, map them to ISO-3 codes
explicitly; a name that maps to nothing must throw, never be skipped.

## Rules

- `check()` tests only what the field can decide. A figure the field cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(field.median) === 132`), never with strict equality on the raw value.
- The title's figures must be the field's own (its median, its farthest point, a drawn level or a quantile): the render refuses a headline whose numbers the field does not hold.

- Every number in a sentence is computed from `field`, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write in the storyboard's `language`. Never put a data column's name in a sentence. Write thousands with an ordinary space, not `toLocaleString("fr-FR")` (its narrow space is in no face).
- After `write_file`, call `render_beat` with format `static`, then `look` at the PNG. The first render bakes the basemap (MapTiler, a few seconds). If the render refuses, read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small `edit_file`, render and look again.
