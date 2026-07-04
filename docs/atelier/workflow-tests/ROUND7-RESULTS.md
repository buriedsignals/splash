# Workflow end-to-end test — round 7 (REAL articles from the live web)

Unlike rounds 2–6 (hand-written briefs), round 7 ran **real, currently-live articles**: each
agent WebFetched the actual page, extracted ONLY stated figures (no fabrication), then applied
the real ② gates. This stresses the whole intake path — extraction, honest provenance, and the
routing — on messy real sources.

## Cases + deliverables

| # | Real source | Data level | Routing | Producer / type | Deliverable |
|---|-------------|-----------|---------|-----------------|-------------|
| 27 | [ONS UK rent by region, Dec 2025](https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/december2025) | web (real) | geographic BUT no UK basemap → sorted bar | **dw-chart d3-bars** | https://datawrapper.dwcdn.net/wXVFP/1/ |
| 28 | [Wikipedia / IMF world GDP](https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)) | web (real) | ranking + raw count (not map-safe) → sorted bar | **dw-chart d3-bars** | https://datawrapper.dwcdn.net/xmQeT/1/ |
| 29 | [OWID electricity mix](https://ourworldindata.org/electricity-mix) | web (real) | **0 proposals — no prose numbers** (DATA_REQUIRED) | (honest refusal) | config.json (conditional) |
| 30 | [2025 Myanmar earthquake](https://en.wikipedia.org/wiki/2025_Myanmar_earthquake) | web (real) | geographic event → locator map | **map-native locator** | `/tmp/r7-case30/static.png` |

## What the real articles proved about honesty (the system behaved correctly)

- **Case 28 — refused to fabricate.** The requested Visual Capitalist article returned HTTP 403;
  every archive/proxy fallback was blocked. The agent STOPPED rather than invent figures, and
  only proceeded once given a fetchable source (Wikipedia/IMF). No numbers were made up.
- **Case 29 — refused an unfetchable story.** The OWID article's body contains ZERO literal
  numbers (all data lives in interactive charts). `suggest-article` emitted 0 proposals and
  named the exact dataset the journalist must supply (the grapher CSV). It did not fabricate a
  mix. This is the correct DATA_REQUIRED outcome.

## Findings

- **F17 — invalid `numberFormat` shipped SILENTLY-WRONG value labels. FIXED + guardrail.** The ②
  layer emitted printf/Python tokens (`.1f`, `.2f`); Datawrapper doesn't understand them and
  rendered 8.4 as ".40" and 32.38 as ".38" — yet the chart PUBLISHED, because the responsive
  label-safety guardrail checks label *position*, not *correctness*. This is the worst class of
  bug: a published chart with wrong numbers. Fix: `normalizeNumberFormat` translates the printf
  class to numeral tokens (`.1f`→`0.0`, `,.2f`→`0,0.00`), passes valid/exotic tokens through
  (durations, currency), and throws on an un-mappable leftover; applied in `spec-to-metadata`,
  surfaced by `validateChartSpec` (warn on auto-correct, error on un-mappable). Emission guidance
  updated. Guardrail: `chart-spec.test.ts`. case27/28 re-rendered with correct labels.

- **F18 — locator drops labels (incl. the priority-1 epicentre) for a tight cluster + far
  outlier. OPEN (recommended fix).** Case 30's three key points (epicentre, Sagaing, Mandalay)
  sit within ~16 km, while Bangkok is ~1,000 km away. The fit must show all four (dataExtent
  passes), which shrinks the cluster so its MapLibre canvas labels collide — only Sagaing,
  Naypyidaw and Bangkok render; the **epicentre label (priority 1) is dropped**. Recommended
  fix: give the locator symbol layer a `symbol-sort-key` from the marker `priority` (so the
  highest-priority label never loses a collision) and de-collide the cluster (offset + leaders),
  or emit an inset for a tight cluster. Not implemented this round.

- **UK sub-national basemap gap (case 27) — real coverage limit, handled honestly.** The system
  ships world (ISO-A3) + us-states only; UK nations/regions have no basemap, so a genuine UK
  regional geographic story always falls back to bars. The fallback fires correctly and states
  why. A UK ITL/NUTS GeoJSON would unlock this common ONS-bulletin class. Follow-up.

## Minor (noted)

- `map-native/scripts/produce.mjs` does not auto-load the repo `.env` (the scrolly producer
  does) — the caller must export `VITE_MAPTILER_KEY`. Small consistency gap.
- Case 27 used amber for a housing subject; "housing" isn't in the Okabe-Ito subject→colour
  table (closest warrant is energy/amber). Add a housing warrant to the colour registry.

## Verdict

Real-web intake works: extraction is honest, fabrication is refused (28, 29), and routing is
sound. Round 7's headline is **F17** — a silent wrong-data bug that only a real messy config
surfaced, now fixed with a guardrail so a bad number token can never again ship a published
chart with wrong labels. F18 (locator cluster labels) is the one open follow-up.
