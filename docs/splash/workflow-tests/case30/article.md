# 2025 Myanmar earthquake — editorial brief

Source: https://en.wikipedia.org/wiki/2025_Myanmar_earthquake (fetched 2026-07-03)

## Extracted facts

| Field | Value |
|---|---|
| Date / time | 28 March 2025, 12:50:52 MMT (06:20:52 UTC) |
| Epicentre | Sagaing Township, near Sagaing–Mandalay border |
| Coordinates | 22.001 °N, 95.925 °E (exact — USGS via Wikipedia) |
| Magnitude | Mw 7.7 (USGS) / 7.9 (IPGP, China surface-wave) |
| Depth | 10 km |
| Fault | Sagaing Fault (strike-slip, supershear) |
| Rupture length | ~500 km (Singu → Kyauktaga) |
| Max intensity | MMI X (Extreme) at Naypyidaw |
| Deaths total | 5,456 (Myanmar 5,352 · Thailand 103 · Vietnam 1) |
| Injuries total | 11,404 |
| Missing | 538 |
| Economic loss | US $11 billion (~14 % of Myanmar GDP) |
| Homes damaged | 120,000+ damaged; 48,834 collapsed |

### Places and distances
- **Sagaing** — 14 km south-southeast of epicentre; ~1,000 deaths; 90 % of structures destroyed
- **Mandalay** — 16 km east of epicentre; 3,325 deaths (Mandalay Region)
- **Naypyidaw** — MMI X; 665 confirmed deaths; airport control tower collapsed; 1.0656 g peak ground acceleration
- **Bangkok** — 102 deaths (State Audit Office construction site collapse, 95 in one building)
- Shaking felt in: 63/77 Thai provinces, Yunnan/Sichuan/Guangxi (China), Vietnam, Laos, India, Bangladesh, Cambodia, Malaysia

## suggest-article output — ProposalSet

```json
{
  "proposals": [
    {
      "anchor": { "paragraphIndex": 0, "quote": "14 km north-northwest of Sagaing city; 16 km west of Mandalay" },
      "claim": "The epicentre struck on the Sagaing Fault 14 km from Sagaing and 16 km from Mandalay; shaking reached MMI X near Naypyidaw, and the disaster killed >5,400 people across Myanmar and Thailand.",
      "intent": "Where did the earthquake strike, which cities were closest, and where did the deadliest impacts occur?",
      "data": "provenance: prose — named places with lat/lon and distances from Wikipedia article",
      "provenance": "prose",
      "needsConfirmation": false,
      "confidence": "high",
      "rationale": "Geographic explainer: the spatial relationship between epicentre, proximate cities, and distant impact cities (Bangkok) is the narrative spine — a locator map is the natural answer."
    }
  ],
  "notes": "Casualty totals and damage figures are cited from the article verbatim; no CSV table was supplied, so no tabular chart proposals are made. Magnitude variants (7.7–7.9) are a single-scalar discrepancy, not a comparison — not proposed as a chart. Regional death breakdown (Mandalay 3,325 / Sagaing ~1,000 / Naypyidaw 665) could form a bar chart but the geographic map tells the fuller story without redundancy."
}
```

## suggest-chart routing — gate-by-gate

**Step 1 — Data profile:**
Data is a set of named places with coordinates (lat/lon), distances from epicentre, and associated metrics (deaths, intensity). No CSV region codes; no normalised rate per administrative region. The structure is: point locations with labels.

**Step 2 — Detect geographic structure:**
Yes — explicit lat/lon coordinates for the epicentre; approximate well-known coordinates for Sagaing, Mandalay, Naypyidaw, Bangkok. No ISO-A3 regional aggregation. The spatial relationship (epicentre → nearest cities → distant impacts) IS the story.

**Gate 5 — Geographic routing:**
All three conditions checked:
1. Spatial pattern IS the story — the narrative is about which places were hit, proximity to the fault, and the reach of damage (Myanmar to Bangkok). Not a ranking or a bar-type comparison.
2. Value type — this is a point event (locator markers), not an areal choropleth. No normalised rate per administrative region is available or meaningful. The map type is LOCATOR (specific named places, not regional fill).
3. Legibility — 5 markers; fully legible.

→ **Route to MAP (locator type)**. Not a bar chart.

**Gate 3 — Scrolly?**
Story is breaking news / event explainer, not long-form sequential narrative. The map does not evolve across 4+ discrete states requiring author-paced scroll. Gate 3 does NOT fire.

**Gate 4 — Video?**
No temporal diffusion data available (e.g. year-by-year spread). Gate 4 does NOT fire.

**Gate 2 — Interactive?**
A "find your region" or per-region exploration hook is not the purpose. Gate 2 does NOT fire.

**Gate 1 — Static (default):**
Fires. Static interactive render is appropriate for a locator map of this complexity.

**Format ladder result:** static → `map-native` with `type: "locator"`.

Note: `suggest-chart` SKILL.md describes the `map-native` producer and explicitly supports `type: "locator"` via `LocatorConfigShape` in `validate-config.ts`. The choropleth path requires ISO-A3 codes and regional data — not applicable here.

## Producer and type

- **Producer:** `map-native`
- **Map type:** `locator`
- **Format:** static (Gate 1)
- **Config:** `docs/splash/workflow-tests/case30/config.json`

## Coordinate sourcing

| Place | Lon | Lat | Source |
|---|---|---|---|
| Epicentre | 95.925 | 22.001 | Exact — Wikipedia (USGS: 22°00′04″N 95°55′30″E) |
| Sagaing | 95.9956 | 21.9588 | Approximate — well-known city coordinates |
| Mandalay | 96.0785 | 21.9588 | Approximate — well-known city coordinates |
| Naypyidaw | 96.1297 | 19.745 | Approximate — well-known city coordinates |
| Bangkok | 100.5018 | 13.7563 | Approximate — well-known city coordinates |

## Concerns

1. **Sagaing/Mandalay lat collision** — both cities share lat 21.9588 in this config because Sagaing and Mandalay are at nearly the same latitude (~21.9°N); they are separated by ~8.4 km east-west (lon differs). A production render should verify no label overlap — use `priority` field to rank.
2. **Casualty figures not fabricated** — all numbers come verbatim from the Wikipedia article (USGS, Myanmar government, Thailand). The article notes totals may be undercounts.
3. **Magnitude discrepancy** — USGS 7.7 vs IPGP/China 7.9 vs Thai ML 8.2. Config uses USGS 7.7 (most widely cited). Not a data artefact; note in caption if needed.
4. **`map-native` locator vs scrolly** — this is a static locator render; no scrolly chapters are defined. If the editorial team wants a guided flyover (epicentre → Sagaing → Mandalay → Naypyidaw → Bangkok), Gate 3 would need reassessment and a `chapters` array would need authoring with human oversight.
