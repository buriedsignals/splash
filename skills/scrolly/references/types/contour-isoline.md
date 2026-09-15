# Contour / isoline — scrolly

**Argues:** A contour (isoline) map answers "where does this continuous field cross a given value" — elevation, temperature, air pressure, rainfall, travel-time-from-a-point — by drawing lines that connect every point sharing the same value, the way topographic elevation lines do.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography. A map close-up centres the subject, both axes.

## Scroll gestures
- **Reveal in order** — bands sweep in from one end of the field's own value range
- **Zoom / focus** — the close-up centres the feature the card names, both axes
- **Name** — a band's threshold value is named once swept in
- **Pull back** — the whole field stands, named bands still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the threshold sweep is computed from the same frozen samples in every card, asserted monotonic

## Worked example
`proof/scrolly-contour-europe-distance/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder.
