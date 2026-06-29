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
