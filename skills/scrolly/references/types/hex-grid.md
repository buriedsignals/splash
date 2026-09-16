# Hex grid (spatial binning — and hex cartogram) — scrolly

**Argues:** A hex-grid map answers "where is this cluster of scattered EVENTS actually densest," by aggregating raw points — incidents, sightings, transactions — into a regular grid of cells so the eye sees a smooth density surface instead of an unreadable smear of thousands of overlapping dots.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography. A map close-up centres the subject, both axes.

## Scroll gestures
- **Staggered reveal** — hex bins fade in bucket by bucket, overlapping their neighbours, never all at once
- **Filter** — the bin range the claim is about keeps its ink
- **Zoom / focus** — the close-up centres the cluster the card names, both axes
- **Count up** — a running count climbs with the staggered arrivals

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- bin aggregation is computed once from the frozen events and held fixed across every card; every country is present beneath the grid

## Worked example
`proof/scrolly-hex-grid-europe-protection/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder. Read `references/map-scrolly-state-binding.md` for the `$state` binding contract — what a plan's `bindings` may and may not read, and how buckets replace a feature-driven paint value — before writing this type's own layers.
