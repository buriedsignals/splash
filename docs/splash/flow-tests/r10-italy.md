# Flow test r10 — Italy UNESCO World Heritage Sites (locator + category filter)

**Date:** 2026-07-05  
**Branch:** guided → interactive locator map + category filter  
**Source article:** https://en.wikipedia.org/wiki/World_Heritage_Sites_in_Italy (Wikipedia)

---

## Data extracted (INPUT / ANALYSE phase)

13 sites, approximate coords, stated-fact category (Cultural / Natural), sourced from Wikipedia's
UNESCO list. No fabricated values; coords labelled approximate.

| Site | lat | lon | Category |
|---|---|---|---|
| Historic Centre of Rome | 41.89 | 12.49 | Cultural |
| Venice and its Lagoon | 45.43 | 12.34 | Cultural |
| Historic Centre of Florence | 43.77 | 11.26 | Cultural |
| Piazza del Duomo, Pisa | 43.72 | 10.40 | Cultural |
| Historic Centre of Siena | 43.32 | 11.93 | Cultural |
| Historic Centre of Naples | 40.85 | 14.27 | Cultural |
| Pompeii, Herculaneum and Torre Annunziata | 40.75 | 14.49 | Cultural |
| Amalfi Coast | 40.63 | 14.60 | Cultural |
| Assisi and Basilica of San Francesco | 43.07 | 12.61 | Cultural |
| City of Verona | 45.44 | 10.99 | Cultural |
| The Dolomites | 46.40 | 11.90 | Natural |
| Mount Etna | 37.73 | 15.00 | Natural |
| Aeolian Islands | 38.60 | 14.95 | Natural |

---

## CADRAGE (Gate 1)

- **Branch:** GUIDED
- **Takeaway:** where Italy's World Heritage sites are, and let readers filter cultural vs natural
- **Channel:** interactive map embedded on the web, explorable
- **Constraint:** none stated

---

## PROPOSITION (Gate 2)

### suggest-chart routing

- **Gate 5:** spatial pattern IS the story (geographic distribution + self-location motive for an
  explorable embed). Data is categorical per point — map-safe. 13 markers = legible.
  → MAP routed.
- **Format ladder:** channel = web embed + explicit "explorable" intent → Gate 2 (interactive,
  exploration hook). Not static.
  → `map-native`, type `locator`.
- **Filters:** one category filter `{ kind: "category", field: "category" }`. 2 distinct values
  (Cultural, Natural) — within the 2–8 cardinality rule. At most 2 filters — satisfied.
- **Basemap:** `world` — the only registered basemap. A regional "italy" basemap is NOT shipped.
  `fitBounds` to the Italy marker extent handles framing without a regional basemap.

**Proposal accepted by journalist.**

### Basemap-registry friction (noted)

The suggest-chart SKILL.md documents `world` and `us-states` as the registered basemaps (per
`src/basemaps.ts`). For a national story like Italy UNESCO sites, a journalist might expect an
`italy` or `europe` basemap — it is not available and the validator would block it. The
`fitBounds`-to-data-extent approach works correctly (the locator snaps to Italy's bounding box),
but this is a gap worth surfacing: the SKILL.md should state explicitly that locator maps are
basemap-agnostic in framing (they fit to markers, not to national borders) and that `world` is
always the correct basemap choice for a regional set of point markers. Without that, a first-time
operator will hit a confusing validator error.

---

## Config emitted

`/tmp/r10-italy-config.json` — type `locator`, basemap `world`, 13 markers with `category` field,
1 filter `{ kind: "category", field: "category" }`, title + description + source all populated.

### Validation

```
validateLocatorConfig → { ok: true, warnings: [] }
```

Zero errors, zero warnings.

---

## PRODUCTION (Gate 3)

Command:
```bash
cd skills/map-native
export VITE_MAPTILER_KEY=$(grep '^VITE_MAPTILER_KEY=' /splash/.env | cut -d= -f2-)
export MAPTILER_API_KEY=$VITE_MAPTILER_KEY
bun scripts/produce.mjs /tmp/r10-italy-config.json /tmp/r10-italy static
```

### Responsive gate (all 4 widths — `dataNotUnderFurnitureOk`)

| Width | scrollOk | titleOk | sourceOk | legendOk | dataNotUnderFurnitureOk |
|---|---|---|---|---|---|
| 360 | true | true | true | true | **true** |
| 768 | true | true | true | true | **true** |
| 1100 | true | true | true | true | **true** |
| 1600 | true | true | true | true | **true** |

### A11y gate

```json
{
  "regionRole": true,
  "regionLabel": "Italy's UNESCO World Heritage Sites by category",
  "sourceHref": "https://whc.unesco.org/en/statesparties/it",
  "controlButtons": 4,
  "allButtons": true,
  "tooltipOk": true,
  "boundedNavOk": true,
  "controlsNotOccluded": true
}
```

### Self-contained assertion

`[assert-selfcontained] OK: /tmp/r10-italy/interactive.html is self-contained`

### Category filter smoke (headless)

Verified by `scripts/smoke-filters.mjs` (general locator fixture) and directly on the Italy file:

- **Filter chips found:** 2 — Cultural, Natural
- **Clustering:** disabled for category filter (correct — clustering would bypass layer setFilter)
- **Count before (all shown):** 8 glyphs rendered
- **After clicking Cultural chip (deselect):** 3 Natural glyphs remain
- **Layer filter expression after toggle:**
  `["all",["all"],["in",["get","category"],["literal",["Natural"]]]]`
- **Count drop:** 8 → 3 ✓
- **On restore:** filter cleared to `["all"]` ✓
- `dataNotUnderFurnitureOk: true` post-filter ✓

**GATE 3: "ship it"**

---

## EXPORT (Gate 4)

Interactive → CODE SOURCE form:

```bash
bun skills/splash/scripts/export-code.mjs /tmp/r10-italy /tmp/r10-italy-export
```

### Bundle contents (`/tmp/r10-italy-export/`)

```
EMBED.md
README.txt
interactive.html        ← self-contained interactive (pan/zoom/hover/filter)
static.html             ← image inlined, no JS, CMS/email safe
static.png
interactive.png
responsive-360.png
responsive-768.png
responsive-1100.png
responsive-1600.png
a11y.png
```

`interactive.html` and `static.html` both present. `EMBED.md` exists.

---

## Summary

| Phase | Result |
|---|---|
| INPUT | Wikipedia UNESCO Italy list fetched — 13 sites extracted |
| ANALYSE | Data profile: 13 points, lat/lon, categorical field (2 values) |
| CADRAGE | Guided; interactive web embed; category filter intent |
| PROPOSITION | Gate 5 → map; Gate 2 → interactive; locator type; `world` basemap; 1 category filter |
| PRODUCTION | All gates green — responsive (4 widths), a11y, self-contained, filter count-drop verified |
| EXPORT | CODE SOURCE — 11 artifacts including `interactive.html`, `static.html`, `EMBED.md` |

---

## SKILL friction / gaps found

1. **Basemap-registry gap (documented above):** `suggest-chart/SKILL.md` lists `world` and
   `us-states` but does not explain that `world` is also the correct choice for a sub-national
   or regional locator map (since `fitBounds` frames to the markers, not the basemap extent).
   First-time operators will search for `italy` or `europe` and hit a validator error with no
   guidance. **Fix:** add a note to suggest-chart under the locator routing section: "For any
   sub-national or regional point set, always use `basemap: 'world'` — `fitBounds` will frame
   to the marker extent automatically."

2. **Wikipedia 404 on canonical URL:** `https://en.wikipedia.org/wiki/List_of_UNESCO_World_Heritage_Sites_in_Italy`
   returned 404 from WebFetch. Fallback `World_Heritage_Sites_in_Italy` worked. No skill impact —
   the article URL is an INPUT, not a produced artifact — but WebFetch URL hygiene should be
   expected in the flow.

3. **Filter count-drop headless test:** `queryRenderedFeatures` returns 0 before a filter toggle
   because the default filterState is empty (= all shown = no MapLibre filter expression set).
   The smoke-filter script correctly measures the drop from a pre-click baseline captured via
   cluster/glyph counts. A naive "count before vs after" on `queryRenderedFeatures` without
   understanding the toggle model will misread the result. The `smoke-filters.mjs` script handles
   this correctly — no action needed, but worth noting for manual verification attempts.

4. **`suggest-chart/SKILL.md` does not mention the locator type explicitly** in its Gate 5 /
   map-native routing section. The choropleth path (ISO-A3, regionKey, valueField) is documented
   in detail; the locator path (lat/lon points, no regionKey, markers array) is only implicit.
   An orchestrator following SKILL.md strictly might not know to emit a locator config when the
   data is points rather than regions. The SKILL.md should add a locator branch: "if data is
   lat/lon point locations (not region codes) → locator map-native config; filters optional."
