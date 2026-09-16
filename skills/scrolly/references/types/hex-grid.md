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

## Devices the worked example implements
- **Origin / no-data hollow cell** — one cell rendered hollow with a dashed edge (`colours.originFill`/`originEdge`, `line-dasharray`) for an area OUTSIDE the measure — a source country, or a genuine no-data gap (`hex-drive.mjs`: `rateClass === null ? originFill : …`). Lives in `plan.mjs`'s optional `origin` param (`fillLayer("origin", …)` + `origin-edge` layer); a subject where every area is inside the measure omits `origin` entirely (`archive/scrolly-hex-grid-europe-wind-2024`).
- **Two-metric re-encode (count → rate)** — the grid's fill re-encodes from one metric to a second (absolute count, then rate/share) rather than only staggering a single value's reveal; read the worked example's own `t.countClass`/`t.rateClass` pair and the card that crosses from one to the other before choosing a second variable.

## Worked example
**Data shape:** per-area — one row per named region (entity/code), no coordinates.

`proof/scrolly-hex-grid-europe-protection/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, cameras, buckets, words), `plan.mjs` (the layers — this type's own marks and `$state` bindings), `DirectedHexScrolly.tsx` (the key/counter chrome around the live map) and `hex-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type hex-grid --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/map-beat/references/types/hex-grid.md` (read-only, other worktree) and its own video proof under `proof/` there (prefixes vary — `map-`, `mapvid-`, `mapgen-`, `video-`; search by the type's own name) — the same subject's camera moves are often the scrolly's own card-to-card travel, adapted to be scroll-driven rather than timed.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder. Read `references/map-scrolly-state-binding.md` for the `$state` binding contract — what a plan's `bindings` may and may not read, and how buckets replace a feature-driven paint value — before writing this type's own layers.
