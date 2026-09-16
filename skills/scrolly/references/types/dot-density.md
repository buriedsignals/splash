# Dot density — scrolly

**Argues:** A dot-density map answers "where inside these regions is this concentrated" — population, cases, production — at a texture level: dense clusters of dots read as dense clusters of the thing, sparse areas read as sparse, without forcing the reader to decode a single number per region the way a choropleth does.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography. A map close-up centres the subject, both axes.

## Scroll gestures
- **Staggered reveal** — dots fade in bucket by bucket, overlapping their neighbours, never all at once
- **Filter** — the region the claim is about keeps its ink
- **Zoom / focus** — the close-up centres the cluster the card names, both axes
- **Count up** — a running count climbs with the staggered arrivals

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- `no-pop-marks-groups` — pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- `no-overlap-pictures-card` — overlap two pictures on one card
- `no-let-cards-notes` — let two cards' notes share a slot where both are visible together

## Precision to assert
- dot positions are declared synthetic (never geocoded to a real address) and every country is present under them

## Devices the worked example implements
- **Size buckets for a data-constant radius** — points are grouped into buckets by the root-mean-square of their own weight (`bucketsOf`), each bucket ONE layer with one radius, so growth never reads a per-feature value (`validateScrollyPlan` refuses that). The general answer to "vary a mark's size across many points on a live map."
- **Count → weight re-encode in one layer** — a bucket's radius travels continuously from its count-mode dot size to its weight-encoded size, bound to a single `$state.weight` field (`grownRadius`, area interpolated linearly) — no cross-fade between a separate "count" and "weight" layer. This is the "re-encode" gesture the type sheet's own gesture list does not otherwise name.
- **Subject isolation with a floor** — every non-subject dot steps back when the subject (nuclear) is isolated, but never below `STEPPED_BACK` (18%) — the field stays legible as "everything else," never disappears. Compare the proportional-symbol worked example's identical rule for its own "nuclear" isolation.
- **Ring that hugs a growing disc** — the subject's ring radius and stroke width both bound to the same growth state, the ring's own radius always the grown disc's radius minus half its (thinning) stroke, since MapLibre strokes outside `circle-radius`.

## Worked example
**Data shape:** points — per-station rows with real lon/lat (weighted synthetic scatter).

`proof/scrolly-dot-density-europe-stations/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, cameras, buckets, words), `plan.mjs` (the layers — this type's own marks and `$state` bindings), `DirectedDotDensityScrolly.tsx` (the key/counter chrome around the live map) and `dot-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type dot-density --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/map-beat/references/types/dot-density.md` (read-only, other worktree) and its own video proof under `proof/` there (prefixes vary — `map-`, `mapvid-`, `mapgen-`, `video-`; search by the type's own name) — the same subject's camera moves are often the scrolly's own card-to-card travel, adapted to be scroll-driven rather than timed.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder. Read `references/map-scrolly-state-binding.md` for the `$state` binding contract — what a plan's `bindings` may and may not read, and how buckets replace a feature-driven paint value — before writing this type's own layers.
