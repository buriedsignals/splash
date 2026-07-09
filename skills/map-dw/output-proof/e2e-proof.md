# Live e2e proof — choropleth

Produced via `produceMap` (which reuses the dw-chart `datawrapper.ts` client) from the generic
`eval/cases/eu-renewables.json` case. **Left published for human review — do not delete.**

- **publicUrl:** https://datawrapper.dwcdn.net/vZRmO/1/
- **chartId:** `vZRmO`
- **PNG:** `eu-renewables.png` (this folder) — exported from the live chart.

## What the exported PNG shows (the real gate — looked at, not just asserted)

- **Basemap `europe-sovereign-states`** (fixed from `world-2019`): the 6 EU countries FILL the frame
  instead of being a tiny cluster lost on a world map (basemap-fit rule, now in SKILL.md).
- All 6 countries coloured by value: Sweden 66 (darkest), Germany 46, Spain 42, Italy 36,
  France 25 (light), Poland 16 (lightest). **Data is bound** via `axes.keys=code` →
  `map-key-attr=ISO_3_SOV` (the europe basemap's ISO-3 join key).
- A proper **light→`#0072B2` blue sequential gradient** on regions and legend (16→66).
  **NOT black** — the bug the spike resolved.
- Insight title, Eurostat source, and `aria-description` (alt = the insight) all present.

## Colour-scale resolution (the load-bearing detail)

- **Failing:** `visualize.gradient = {colors:[…]}`, and `colorscale` that included `stops: "equidistant"`
  (a string) alongside `colors`, both rendered every region + the legend **black**.
- **Working:** `visualize.colorscale = { mode:"continuous", interpolation:"equidistant",
  colors:[{color,position}…] }` — NO `stops` string. Renders the correct light→blue gradient.
- Verified by creating real charts, patching candidates, publishing, exporting PNG, and LOOKING.
  The fix lives in `src/spec-to-map-metadata.ts` (it never emits a `stops` string).

---

# Live e2e proof — symbol map (RETIRED — historical evidence)

> **RETIRED.** map-dw no longer produces symbol maps: `validateMapSpec` rejects a symbol spec and
> routes it to `map-native` (see below + the hover-tooltip section). This proof is kept as the
> **evidence for that decision** — the exported static PNG shows sized-but-UNLABELED circles (names
> and values appear ONLY on hover), so the owned static export cannot carry the claim. The generic
> `eval/cases/france-cities.json` case was removed. Valued point maps now go to `map-native`, whose
> proportional-symbol renderer directly labels the top-N circles by name + value.

Produced via `produceMap` (before the retirement) from the former `eval/cases/france-cities.json` case.

- **publicUrl:** https://datawrapper.dwcdn.net/39yaG/1/
- **chartId:** `39yaG`
- **PNG:** `france-cities.png` (this folder).

## What the exported PNG shows (looked at, not just asserted)

- Four **filled circles SIZED BY POPULATION** placed at correct lat/lon: Paris (huge), Marseille
  (mid), Lyon (small), Bordeaux (smallest). Coloured by the light→`#0072B2` Okabe-Ito scale,
  legend 260→2100. INSEE source, insight title, `aria-description` present.
- Basemap `france-metropolitan-departments` is a backdrop (the points' extent fits it).

## Symbol binding resolution (the load-bearing detail)

- **Failing:** the prior spike set `axes.keys`/`axes.values` (choropleth-style region join) — the
  basemap rendered but **NO circles at all**. Symbol maps are coordinate-based, not key-joined.
- **Working:** `axes.lat`=lat col, `axes.lon`=lon col, **`axes.area`=size col (drives SIZE)**,
  `axes.values`=colour col; `visualize.basemap` (backdrop) + `visualize["map-type-set"]=true` +
  the same `colorscale` block (no `stops` string). The missing piece was **`axes.area`**.
- Verified by patching candidates on a real chart, publishing, exporting PNG, and LOOKING until
  sized circles appeared. The mapper lives in `src/spec-to-map-metadata.ts`.

---

# Live e2e proof — locator map

Produced via `produceMap` from the generic `eval/cases/arve-sites.json` case.
**Left published for human review — do not delete.**

- **publicUrl:** https://datawrapper.dwcdn.net/Jb5NP/1/
- **chartId:** `Jb5NP`
- **PNG:** `arve-sites.png` (this folder).

## What the exported PNG shows (looked at, not just asserted)

- Three **point markers (pins)** placed at the right OSM locations with labels: Annemasse (blue),
  Geneva (vermillion), Chamonix (green) — Okabe-Ito cycle. The view is **framed to the Arve
  valley**, not the whole world. OpenStreetMap source, `aria-description` present.

## Locator binding resolution (the load-bearing detail)

- **Marker model:** markers live in `metadata.visualize.markers` as `{id, type:"point",
  coordinates:[lng,lat], title, markerColor, icon:{circle path}, text, anchor, scale, visible}`.
  There is NO data table and NO value join (`produceMap` skips `setData` for locator).
- **Failing:** `metadata.visualize.view = {fit:true}` was supposed to auto-frame the markers — it
  rendered the **WHOLE WORLD** with the pins as a tiny cluster (caught ONLY by looking at the PNG,
  never by a test, which only checked the PNG was non-empty).
- **Working:** the mapper computes an explicit `view.center` (markers' bbox midpoint) + `view.zoom`
  (`min(log2(360/spanLng), log2(170/spanLat))` with 40% padding), `fit:false`. This frames the pins.
  Re-verified by re-producing and LOOKING.

---

# Live e2e proof — hover tooltips (symbol + locator)

Choropleth already had a working tooltip (`%REGION_NAME%` / `%REGION_VALUE%`). Symbol set NO
tooltip and locator markers had `tooltip:{enabled:false}`, so neither showed anything on hover.
Both are now fixed and **verified LIVE in a real browser (Playwright hover + screenshot)** — a
static PNG cannot show a tooltip, which is exactly why the gap was missed before.

**Symbol** (`d3-maps-symbols`) — produced via the real `produceMap`. publicUrl:
https://datawrapper.dwcdn.net/Ud7sZ/1/ · screenshot: `tooltip-symbol.png` (this folder).
- Resolved config (in `metadata.visualize.tooltip`):
  `{ enabled:true, title:"{{ city }}", body:"{{ population }}", fields:{ city:"city", population:"population" } }`.
- Symbol maps reference **DATA COLUMNS via DW mustache `{{ column }}`** — NOT `%REGION%` (that is
  choropleth-only). Each token MUST be declared in `tooltip.fields` ({ token: column }) or it renders
  blank. `title` = `labelColumn` (place name), else the size column; `body` = the size column.
- Symbols draw on a **CANVAS** (no `<circle>` in the DOM), so the browser check hovers by pixel
  position over the canvas. Hovering Paris showed a tooltip box reading **"Paris / 2100"** — captured
  in `tooltip-symbol.png`.

**Locator** (`locator-map`) — produced via the real `produceMap`. publicUrl:
https://datawrapper.dwcdn.net/YqI3y/1/ · screenshot: `tooltip-locator.png` (this folder).
- Resolved config: each marker now carries `tooltip:{ enabled:true }` (was `{enabled:false}`). The
  marker `title` shows on hover.
- Markers are `maplibregl-marker` DOM elements. The browser check proved causation: **zero**
  `[class*=tooltip]` elements existed BEFORE hover; hovering the Annemasse pin spawned exactly one
  `tooltip-text-wrapper` element reading **"Annemasse"** — captured in `tooltip-locator.png`.

The deliverable was the SCREENSHOT showing the hover tooltip, not the metadata being present.

## Caveat

The eval corpus is self-authored and grounded in best-practice — a relative-improvement instrument,
not absolute truth (same stance as suggest-chart / suggest-article). A passing unit test does not
prove the map looks right; the exported PNGs above are the gate — each was looked at, and the
locator world-view bug was caught and fixed exactly that way.
