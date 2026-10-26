# Contour / isoline (video) — what you write

The video is already designed: it comes from the worked example `proof/video-contour-europe-distance`
and the story's PALETTE.md and DIRECTION.md. 18.3 s at 30 fps. It opens on a title card (eyebrow +
title); then the LIVE MapTiler map of Europe and the key; then a SWEEP inland from every coast — a
tinted front crossing the land, each isoline drawn as the front passes it, a count climbing ("N % of
the land within K km") while its curve traces — that stops at the MEDIAN line, set in the accent; then
the sweep runs on to the farthest point from the sea, which is ringed and numbered; the tint lifts and
the credit lands. There is no standfirst and no sentence on screen. You do not change any of that.

You write ONE file, `beat.mjs`, in the beat folder. It reads `data.json` beside it and exports the
STUDY AREA and the WORDS. `render-beat.mjs` (already in the folder) measures the field over the study
area, draws the lines (100, 200, 300, 400, 500 km below the farthest point, and the median), measures
the live map, places every number, the key, the curve and the credit, renders ten stills, prints
`look at: <png>`, then renders the mp4 (about five minutes; a re-render with the same study area and
words reuses the map's measurement).

`beat.example.mjs` (in the folder) is the worked example's own `beat.mjs`. Read it first, then write
this story's from scratch with `write_file`.

## What this kit can draw — and what it cannot

It draws ONE field: **distance to the sea, over European countries** (measuring frame 25°W–45°E,
34°N–72°N), computed on a 6 km grid in an equal-area projection from the coastline in `shapes.geojson`.
The story chooses the STUDY AREA — which countries the claim is measured over — by ISO alpha-3 code
from `data.json`. It cannot draw elevation, temperature, rainfall, travel time, or a distance to the
nearest record (station, hospital, school). If the takeaway is about such a field, this is not the kit
for it: say so instead of writing a beat.

It refuses, by name: a code the shapes do not carry (use ISO-3, `FRA` not `FR` or `France`), a code
twice, a country the frame CUTS (Russia: leave it out of `study` and say so), a country wholly
outside the frame, a study area too shallow for two lines. Islands wholly outside the frame (Svalbard,
the Azores, the Canaries) are not measured.

## The fields of the default export

| Field | What it is |
|---|---|
| `eyebrow` | The rubric on the title card, two to four words, in the story's language. |
| `title` | The title card in one to three forms, longest first: the FIRST form is the journalist's takeaway from STORYBOARD.md, copied word for word as a literal string (the render checks it); shorter forms may follow. |
| `study` | The ISO alpha-3 codes of the countries the claim is measured over, from `data.json`. |
| `count` | The climbing count, with `{p}` where the percent of the land goes and `{km}` where the distance goes ("{p} % within {km} km"). |
| `outsideLabel` | The key's word for land outside the measurement ("not measured"). |
| `source` | The credit in one to three forms, longest first, exactly as the storyboard records it; EVERY form must carry "© MapTiler © OpenStreetMap". The render sets the longest form that finds one line of open sea. |
| `lang` | Optional: the story's language tag ("fr", "en"). Default: STORYBOARD.md's `language`. |
| `evidenceLevels` | Optional, 2. |
| `check(map)` | Throws if the field no longer supports the title. `map.median` (km: half the study land is nearer the sea), `map.deepest` (km: the farthest point), `map.deepestIso` (its country), `map.within(km)` (percent of the study land within `km` of the sea), `map.studyCount`. |

## Reading the data

```js
const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const CODE = table.columns.findIndex((c) => c.name === "iso3");
const study = table.rows.map((r) => r[CODE]).filter((code) => code && code !== "RUS");
```

Country names without codes: `import { iso3Of } from "./countries.mjs"`.

## Rules

- `check()` tests only what the field can decide. A figure the field cannot confirm stays in the title as the journalist wrote it and is not checked.
- In `check()`, compare a computed value with the takeaway's figure at the takeaway's precision (`Math.round(map.median) === 132`), never with strict equality.
- When the title states the median distance, `check()` holds `map.median` to it.

- Every number is computed, never typed — except the title's first form, which is the journalist's own sentence, copied as written.
- The title says the confirmed takeaway; do not invent a different claim.
- Write every word in the storyboard's `language`. Never put a data column's name on screen.
- After `write_file`, call `render_beat` with format `video`, then `look` at the PNG it names (the
  last frame: every line, the median in the accent, the farthest point ringed). If the render refuses,
  read its message and fix `beat.mjs`. If the picture is wrong, fix `beat.mjs` with a small
  `edit_file`, render and look again.
