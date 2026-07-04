# France's nuclear power stations: find yours on the map

France operates one of the largest nuclear fleets in the world. As of 2025, 18 sites remain operational, spread from the English Channel coast (Gravelines, Flamanville, Paluel, Penly) to the Rhône valley (Bugey, Cruas, Tricastin, Saint-Alban) and the Loire basin (Chinon, Belleville, Dampierre, Saint-Laurent, Nogent). Two plants have now closed: Fessenheim, the country's oldest, shut in June 2020; Brennilis (Brittany) is in long-term decommissioning.

All French reactors are pressurised-water reactors (PWR), built across three successive series — CP (900 MWe), P4 (1,300 MWe), and N4 (1,500 MWe) — with a single EPR unit under construction at Flamanville.

**Source:** Wikipedia — Nuclear power in France; List of nuclear power stations (accessed 2026)

**Editorial intent:** An explorable regional map — France only — where the reader can toggle between operational and shut-down plants to understand the geographic spread and the two closures. Reader-exploration piece, not a guided narrative.

**Routing notes:**
- Data shape: named geographic points (lat/lon), one categorical attribute (status: operational / shut down), one numeric attribute (number of reactors per site, 2–6).
- Gate 5: spatial pattern IS the story (geographic spread across France, clustering on rivers, the two coastal closures). Value is a categorical per-site attribute — map-safe. Regions are legible (20 sites, all labelled). → MAP.
- Gate 2 (interactive): reader exploration hook — "find your region's plant, toggle status". Explicit filter intent → map-native (interactive).
- Map type: LOCATOR (point markers, not choropleth). Each marker carries a `category` field (operational / shut down).
- Filter: `kind:"category"`, `field:"category"` — 2 distinct values, within 2–8 cardinality limit. Passes validateMapFilters.
- No time filter emitted (not wired). No range filter (numeric reactor count is secondary, not the exploration axis).
- Producer: map-native / type: locator.
