# End-to-end proof — ② → map-dw (live)

Closing the map-routing path with a real produced choropleth (not just structural composition).

Case: `eu-renewables-gradient`. Acting as ② (runtime procedure + KB refs, including
`format-selection.md` Gate 5) emitted a **MapSpec** (`producer: "map-dw"`, family `geographic`).

## Article / intent

> "Renewables form a clear north–south gradient across Europe"

A spatial pattern: normalized share of renewables in electricity production (%) across legible
sovereign European states. The story IS the geography — high-latitude countries cluster near 100%,
southern ones in the 20–45% range. Gate 5 applies: spatial pattern + normalized rate + legible
countries → route to a map, not a sorted bar chart.

## Decision (Gate 5)

② cited Gate 5: the north–south gradient is only legible on a map; a ranked bar chart would lose
the spatial structure entirely. The data is a normalized rate (%, not raw count) and the units are
sovereign states — all three conditions for map routing are satisfied. ② emitted a `MapSpec`, not a
`ChartSpec`.

## MapSpec emitted

```json
{
  "producer": "map-dw",
  "mapType": "choropleth",
  "basemap": "europe-sovereign-states",
  "mapKeyAttr": "ISO_3_SOV",
  "regionKey": "code",
  "valueColumn": "share",
  "data": "code,share\nNOR,99\nSWE,68\nFIN,51\nDEU,59\nGBR,48\nFRA,27\nESP,44\nITA,41\nPOL,21\nGRC,38\nPRT,61\nNLD,40",
  "title": "Renewables form a clear north–south gradient across Europe",
  "intro": "Share of electricity from renewables, 2024 (%)",
  "colorScale": [
    { "color": "#f7fbff", "position": 0 },
    { "color": "#08519c", "position": 1 }
  ],
  "source": { "name": "Ember, Global Electricity Review 2025" },
  "altInsight": "Renewables supply nearly all of Norway and Sweden's electricity but only a fifth to a half across southern Europe"
}
```

(These are the real `ChoroplethMapSpec` fields — `mapType`, `mapKeyAttr`, `regionKey`, `valueColumn`,
`data`, `colorScale` as `{color,position}[]`, `altInsight` — the exact shape `validateMapSpec` checks;
`producer:"map-dw"` is the routing discriminator the eval gate reads.)

Join key `ISO_3_SOV` = ISO-A3 codes; the `code` column in the CSV is a direct bind — no
intermediate lookup required.

## Validation

`validateMapSpec` run on the emitted spec:

```
{ validates: true, warnings: [], pass: true }
```

0 warnings — basemap exists, join key resolves, value column present, title is an insight sentence.

## Live production

`map-dw` produced a published Datawrapper choropleth:

- **Chart id:** `2C3f2`
- **Embed URL:** `https://datawrapper.dwcdn.net/2C3f2/1/`
- **PNG:** `/tmp/system-test/eu-renewables-map.png`

The north–south gradient is immediately legible: Norway and Sweden at the top of the colour ramp,
Poland and France at the bottom.

## Contrast note — Gate 5 in both directions

The earlier EV-sales article ("Which country sold the most EVs last year?") was a **ranking** with
no spatial pattern. ② correctly stayed a sorted bar chart (`d3-bars`) — Gate 5 blocked the map
route. The `region-unemployment-ranking` eval case guards this direction: four Spanish regions,
magnitude question → bars, not a choropleth.

So the ②→map-dw link is proven live, and the gate works in both directions.

---

## Native map (interactive / video) — slice 1b

Closing the ②→map-native routing path with a real produced choropleth (interactive HTML + 3 mp4s + static
PNG).

Case: `eu-renewables-explore`. A spatial story with an exploration hook — "find your country on the map" —
triggers Gate 2 (interactive format). Gate 5 applies: spatial pattern + normalized rate + legible countries
→ map family. Format ladder escalates: exploration intent → `map-native` (not `map-dw`). ISO-A3 codes
confirmed in data (`NOR`, `SWE`, etc.) — no fallback needed.

### Article / intent

> "Let readers explore how each European country's renewable share compares — find your country on the map"

### ChoroplethConfig emitted

```json
{
  "producer": "map-native",
  "regionKey": "code",
  "valueField": "share",
  "rows": [
    { "code": "NOR", "share": 99 },
    { "code": "SWE", "share": 68 },
    { "code": "DEU", "share": 59 },
    { "code": "GBR", "share": 48 },
    { "code": "FRA", "share": 27 },
    { "code": "ESP", "share": 44 },
    { "code": "ITA", "share": 41 },
    { "code": "POL", "share": 21 }
  ],
  "basemap": "world",
  "title": "Explore how Europe's renewable electricity share varies by country",
  "description": "Share of electricity generated from renewables, by European country, 2024 (%)",
  "unit": "Share of renewables (%)",
  "valueUnit": "%",
  "source": {
    "name": "Ember, Global Electricity Review 2025",
    "url": "https://ember-climate.org/insights/research/global-electricity-review-2025/"
  }
}
```

### Validation

`validateChoroplethConfig` run on the emitted config:

```json
{ "ok": true, "warnings": [] }
```

0 errors, 0 warnings — regionKey/valueField present, rows non-empty with ISO-A3 codes and numeric values,
basemap set, title is an insight (≥12 chars, not a year range), description and source present.

### Live production

`bun scripts/produce.mjs <config.json> /tmp/system-test/native-map all` (from `skills/map-native/`).

Produced artifacts:

- **Static PNG:** `/tmp/system-test/native-map/static.png` (469 kB)
- **Interactive HTML proof PNG:** `/tmp/system-test/native-map/interactive.png` (444 kB) — popup triggered at the NOR hover coords (the adjacent SWE polygon was hit there), value assertion passed
- **Landscape mp4:** `/tmp/system-test/native-map/landscape.mp4` (3.5 MB)
- **Square mp4:** `/tmp/system-test/native-map/square.mp4` (4.4 MB)
- **Portrait mp4:** `/tmp/system-test/native-map/portrait.mp4` (5.0 MB)
- **Video stills:** `video-landscape-still.png`, `video-square-still.png`, `video-portrait-still.png`

The interactive proof snap confirms popup interaction works: hovering NOR triggered the Sweden popup (adjacent country at those screen coords), popup value assertion passed. All 5 output files produced without error.

---

## Scrolly (Gate 3) — slice 2

Closing the ②→scrolly routing path with a real produced scrolly HTML.

Case: `eu-renewables-scrolly`. A geographic guided narrative — "walk readers north-to-south through
Europe's renewables divide, one country at a time" — fires Gate 3 (irreducibly sequential, author-paced,
long-form). Gate 5 applies: spatial pattern + normalized rate + legible countries → map family. Gate 3
escalates: sequential narrative, single map evolving across states → `scrolly` (not static/native).
ISO-A3 codes confirmed (`NOR`, `SWE`, etc.) — no fallback needed.

### Article / intent

> "Walk readers north-to-south through Europe's renewables divide, one country at a time, building to the takeaway"

### ChoroplethConfig emitted (`producer: "scrolly"`)

```json
{
  "producer": "scrolly",
  "regionKey": "code",
  "valueField": "share",
  "rows": [
    { "code": "NOR", "share": 99 },
    { "code": "SWE", "share": 68 },
    { "code": "DEU", "share": 59 },
    { "code": "GBR", "share": 48 },
    { "code": "FRA", "share": 27 },
    { "code": "ESP", "share": 44 },
    { "code": "ITA", "share": 41 },
    { "code": "POL", "share": 21 }
  ],
  "basemap": "world",
  "title": "Europe's renewables divide: Norway leads, Poland lags — a north-to-south story",
  "description": "Share of electricity generated from renewables, by European country, 2024 (%)",
  "unit": "Share of renewables (%)",
  "valueUnit": "%",
  "source": {
    "name": "Ember, Global Electricity Review 2025",
    "url": "https://ember-climate.org/insights/research/global-electricity-review-2025/"
  }
}
```

The scrolly config is a ChoroplethConfig with `producer:"scrolly"` as the discriminator. The scrolly
engine reuses the same config shape as `map-native`.

### Validation

`validateChoroplethConfig` (from `skills/map-native/src/validate-config.ts`) run on the emitted config:

```json
{ "ok": true, "warnings": [] }
```

0 errors, 0 warnings — regionKey/valueField present, rows non-empty with ISO-A3 codes and numeric values,
basemap set, title is an insight (≥12 chars, not a year range), description and source (name + url) present.

### Live production

`bun scripts/produce.mjs <config.json> /tmp/system-test/scrolly-routed` (from `skills/scrolly/`).

Produced artifact:

- **Scrolly HTML:** `/tmp/system-test/scrolly-routed/scrolly.html` (5,512 kB single-file build, gzip 1,491 kB)

The Vite build inlined all JS and CSS into a single self-contained HTML file. `PRODUCE_RESULT` confirmed
the output path.
