# Locator — scrolly

**Argues:** A locator answers "where, exactly" — it names a set of places relevant to the story (the sites of an event, the stops on an itinerary, the hometowns of people quoted) with nothing more than position and, optionally, a category.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography. A map close-up centres the subject, both axes.

## Scroll gestures
- **Staggered reveal** — markers fade in bucket by bucket, never all at once
- **Name** — a marker is named once it arrives, by a deterministic priority order
- **Zoom / focus** — the close-up centres the marker or cluster the card names, both axes
- **Pull back** — every marker stands, named ones still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- marker radius stays uniform across every card — size never carries a value; label decluttering is deterministic

## Worked example
`proof/scrolly-locator-zaporizhzhia/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder.
