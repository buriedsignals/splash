# Workflow end-to-end test — round 3 (fill the coverage gaps)

Four articles chosen to exercise producers/formats round 2 didn't reach: a **map video**,
a **flow/route**, a **proportional symbol** map, and the **"sans rien"** (bare topic, no
article, no data) path. Varied data levels as requested.

## Cases + deliverables

| # | Article / topic | Data? | Routing | Producer / format | Deliverable |
|---|-----------------|-------|---------|-------------------|-------------|
| 9 | Solar's uneven global rise | Yes | Gate 5 map (spatial spread) + Gate 4 video (motion reveal) | **map-native choropleth STORY video** | `case9/out/solar-story.mp4` (2.7 MB, 549 frames) |
| 10 | China–Europe rail corridor | **No** (route only) | No data → geographic journey → route/flow | **map-native route** (static + interactive) | `case10/out/rail-route.png` |
| 11 | World's busiest container ports | Yes | Gate 5 → symbol (magnitude at POINTS, not regions) | **map-native proportional symbol** | `case11/out/ports-symbol.png` |
| 12 | "Why are coffee prices so volatile?" | **None** (bare topic) | Ideate → literal chart needs price data (won't invent) → data-free geographic explainer | **map-native locator** | `case12/out/coffee-belt-locator.png` + `case12/IDEATION.md` |

**Map VIDEO gap filled** (case 9 — the motion path for maps, untested before). **From-nothing
path works honestly** (case 12 — real deliverable, no invented data, the price-data need
named not fabricated). Symbol + route static renders are both strong (verified visually).

## Findings (new this round)

All three are map-native framing/coverage issues. The responsive guardrail is WORKING — it
correctly rejected the mis-framed wide-extent maps; the fixes are engine-side.

- **F8 — a globe-spanning SYMBOL map clips its data at mobile.** The 12 ports span ~250° of
  longitude (LA → Busan). At 360/768 px the fit centres on Africa/Europe and cuts the entire
  Asian cluster (the biggest ports — the actual story). `dataExtentVisibleOk` fails at
  360/768; desktop (1100/1600) passes. Fix: at narrow aspects the fit must zoom out to keep
  the full point extent visible.
- **F9 — ROUTE responsive gate measures the wrong extent.** The route auto-includes every
  country it crosses (incl. huge Russia), so the *territory* bbox dwarfs the route bbox. The
  engine deliberately frames the route bbox +15% (so the journey isn't a speck), but
  `dataExtentVisibleOk` measures the territory polygons → fails at ALL widths even though the
  static render is perfect. Fix: for route maps the check should measure the ROUTE extent
  (what the framing targets), not the territory polygons.
- **F10 — only the `world` (countries) basemap ships.** No `us-states` / `fr-*` geojson exists
  (`assets/geo/` has `world.geojson` only), despite the SKILL text listing sub-national
  basemaps. So a US-state or French-department choropleth is NOT producible today. Case 9 was
  repurposed to a country-level (world) choropleth to still exercise the map-video path.

## Findings — all fixed with guardrails (2026-06-22)

Every finding raised across the three rounds is now fixed at the system layer with a
guardrail test + render verification, EXCEPT the one capability gap:

- **F1** — palette semantic aliases + clear error (`palette.test.ts`).
- **F3** — chart-native tolerant year/date parser (`chart-geometry.test.ts`).
- **F4** — chart-native snap serves the injected build; shared `chartDistSub` path
  helper so vite.config + snap-proof can't drift (`build-paths.test.ts`). Verified: a
  produced line chart reflects its spec, not a default sample.
- **F5** — dw-chart multi-series tick-duplicate dedup (`label-safety.test.ts`).
- **F6** — dw-chart annotation clears EVERY series (`spec-to-metadata.test.ts`). Verified
  clean at all widths; a long callout at a tight crossover is still guardrail-rejected
  by design.
- **F8** — responsive data-extent gate is aspect-aware (a globe-spanning extent can't be
  framed in portrait Mercator) — `maxFittableLngSpan` + tests. Ports produce clean.
- **F9** — RouteMap exposes the route bounds it frames (not the territory-inclusive
  extent). Route produces clean at all widths.
- **F10** — sub-national basemaps ship: basemap registry + `us-states.geojson` +
  config-driven geojson/joinKey selection + fast validation (`basemaps.test.ts`).
  Verified: a US-state solar choropleth renders clean.
- **F11** — magnitude map story reveals ranked leaders + tail with rank-aware captions
  (`map-story.test.ts`). Verified: the case-9 video walks 4 reveals.

### Remaining capability gap (not a defect — unbuilt feature)

- **Chart scrollytelling** is not wired: the `scrolly` engine is map-only ("chart-native
  next") and `chart-native` ships static/interactive/video but no scrolly. A true *chart*
  scrolly is not yet producible. Tracked for a future build, not a regression.

### Follow-ups noted while fixing (small, non-blocking)

- us-states support was added to the choropleth static/interactive path; the map
  video (`ChoroplethStory`) + scrolly still bundle world only — extend `GEOJSON_BY_BASEMAP`
  to those paths when a sub-national motion/scrolly map is needed.

Fixed with guardrails so far: F1 (palette aliases), F3 (chart-native year parse), F5
(dw-chart multi-series tick dedup), F11 (below), plus the round-1 responsive-label rewrite.

### F11 — map STORY narrative was limited to 2 beats (max & min) for magnitude — FIXED

Caught on case 9's video: a magnitude choropleth story revealed only the highest and the
lowest region — two beats can't carry a distribution, the same defect as the earlier
scrolly-narrative issue but on the VIDEO path (`deriveMapStory`'s magnitude branch was the
un-fixed "pre-fix behaviour"; only the temporal branch had been enriched). Fix:
`magnitudeRevealRows` reveals the TOP leaders (up to 3) + the tail, each tagged with its
rank/role, and `magnitudeCaption` writes a rank-aware, data-tied line ("Chile leads — 22%",
"Spain — 21%, 2nd", "The long tail — South Africa, 4%"). It feeds BOTH the video and the
scrolly (they consume `beat.copy`). Guardrail `auditMapStoryReveals` fails a magnitude story
that collapses to <3 reveals for a ≥4-region dataset or whose reveals lack a rank cue.
Verified at render: the case-9 video now walks Chile → Spain → Australia → the tail (4
reveals, 801 frames) instead of 2. Guards in `map-story.test.ts`.
