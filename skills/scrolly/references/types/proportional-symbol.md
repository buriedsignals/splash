# Proportional symbol (symbol / bubble map) — scrolly

**Argues:** A proportional symbol map answers "how big is this quantity AT this specific place" — a city's population, an earthquake's magnitude, a plant's output — where the geography is a set of POINTS, not a partition of area.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography. A map close-up centres the subject, both axes.

## Scroll gestures
- **Staggered reveal** — symbols fade in bucket by bucket, largest first, overlapping their neighbours
- **Count up** — the running total climbs with the staggered arrivals
- **Zoom / focus** — the close-up centres the symbol the card names, both axes
- **Name** — a symbol's value is named once it arrives

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- symbol area (never radius alone) stays proportional to the same asserted value in every card; the key's scale sample matches the camera's own zoom

## Worked example
`proof/scrolly-proportional-symbol-europe-capacity/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder.
