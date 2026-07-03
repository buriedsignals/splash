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

**Logged for a dedicated fix (real, not blocking the static/interactive deliverables):**
- **F12 — hex-grid framing breaks on wide/global extents.** Two cases: (a) a GLOBAL,
  antimeridian-crossing point set produces degenerate layout bounds wider than 360°
  (−216°…+216°) and centres the map on the antimeridian; (b) at a wide-SHORT viewport
  (1600×560) the fit degenerates to a zoomed-in, wrong-hemisphere view (zoom 7.6, centred
  in the Atlantic for a Pacific dataset). `clampFitPad` (padding cap) did NOT resolve (b),
  so the cause is deeper than furniture padding — likely a longitude-wrap ambiguity in the
  hex-grid fit for extents approaching/exceeding half the globe. Needs a focused fix; other
  map types (dot-density, cartogram, choropleth) frame the same-width viewport fine, so it
  is hex-grid-specific. Mitigation for now: a REGIONAL hex-grid (a clean sub-global bbox)
  frames correctly.

**Minor polish (noted, non-blocking):**
- hex-grid ignores the `palette` config field (rendered blue, not the requested amber).
- scrolly caption grammar ("1 nights" → "1 night") and the middle leaders (rank 2/3) show
  "name — value" without the ordinal that `magnitudeCaption` provides on the video path.
