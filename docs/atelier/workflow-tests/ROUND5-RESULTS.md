# Workflow end-to-end test — round 5 (the last map types + map scrolly)

Covers the map types rounds 1–4 didn't reach — **hex-grid**, **dot-density**, **cartogram** —
plus a **map scrolly** (which also re-verifies the F11 narrative fix in the scroll format).

## Cases + deliverables

| # | Article / topic | Data | Producer / type | Deliverable |
|---|-----------------|------|-----------------|-------------|
| 17 | Ring of Fire (M4.5+ quakes) | REAL USGS feed | **map-native hex-grid** (spatial bins, count) | `case17/out/ring-of-fire-hexgrid.png` |
| 18 | Where Africa's people are | population by country | **map-native dot-density** | `case18/out/africa-dot-density.png` |
| 19 | US military spending dwarfs all | SIPRI $bn | **map-native cartogram** (scaled) | `case19/out/military-cartogram.png` |
| 20 | Southern Europe's tropical nights | nights by country | **map scrolly** (guided walk) | `case20/out/heatwave-scrolly.html` |

- **dot-density** and **cartogram** produced clean at all widths (340–1600 px) and read well
  (Nigeria/Nile dot clusters; the USA polygon dwarfing every other in the cartogram).
- **hex-grid** renders a clean Ring-of-Fire density map (real USGS data) and passes at
  768/1100 px — but see F12.
- **map scrolly (20)** loads, no errors, and the narrative now ADAPTS: it walks Malta (the
  highest of 16) → Cyprus → Greece → Norway (the lowest) — the F11 ranked-leaders + tail
  fix, confirmed in the SCROLL format (the original "always highest & lowest" complaint).

## Findings

**Fixed this round (guardrail = the produce-time responsive gate):**
- **F8b** — the aspect-aware data-extent guard now uses latitude CONTAINMENT (not centring)
  when the width is unfittable: a floored-zoom map centres near the equator while
  northern-hemisphere data still sits fully in view. Fixed the global cartogram at 360 px.

**F12 — hex-grid framing on wide/short viewports — FIXED (root cause found).** At a
wide-SHORT viewport (1600×560) the fit degenerated to a zoomed-in, wrong-hemisphere view
(zoom 7.6, centred in the Atlantic for a Pacific dataset). Root cause: the idle handler
built the free-pan `maxBounds` from `getBounds()`, which returns UNWRAPPED longitudes when
the view wraps (east 307.9 = −52 + 360) → a >360°-wide box that MapLibre mishandles,
pinning the map to a corner. Fix: a shared `safeSetMaxBounds` helper (`controls.ts`) that
skips a near-global (>355° wide / >175° tall) envelope — it constrains nothing anyway —
wired into ALL SIX map components so no sibling type can reintroduce it. Guardrail:
`controls.test.ts`. Hex-grid now passes at every width. (The separate GLOBAL
antimeridian-crossing case — a single point set spanning the whole world — is still best
served by a regional focus; the guard prevents the crash, and a truly global hex-grid is a
rare editorial choice.)

**Also fixed:** hex-grid now HONOURS the `palette` config field (was hard-coded to BLUES)
— the Ring-of-Fire map renders in the amber/oranges ramp fit for seismicity. Guardrail:
`hex-grid-geo.test.ts`.

**Minor polish (noted, non-blocking):**
- scrolly caption grammar ("1 nights" → "1 night") and the middle leaders (rank 2/3) show
  "name — value" without the ordinal that `magnitudeCaption` provides on the video path.
