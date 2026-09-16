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

## Devices the worked example implements
- **Radius true at every zoom, set once** — a symbol's area ∝ value; its screen radius is one `["exponential", 2^GROWTH]` interpolation between two zoom stops (`radiusExpression`), which is exact at every zoom a camera travel passes through — never a per-frame recompute, and never reads a feature in a binding.
- **Overlapping rank-bucket arrival stretch** (`arrivalsFor`, `OVERLAP = 0.45`) — buckets fade in largest-first over SHARED, overlapping stretches of the scroll rather than each popping the instant its rank is passed, so the last bucket lands exactly on its own card. The general answer to this type's (and the hex-grid's, the dot-density's, the locator's) own "staggered reveal" gesture.
- **Isolate by dimming the rest, not by highlighting the one** — when the subject (nuclear) is isolated, every OTHER station steps back; the subject itself stands in its ordinary accent and stroke weight, unchanged. Compare the dot-density worked example's identical rule (`STEPPED_BACK`) and the cartogram's `OTHERS_OPACITY`.
- **Leading label pinned beside a growing mark** — the largest station's name is translated by the mark's own current radius at every zoom (`nameOffset`, a paint `text-translate` interpolation) so it stays clear of the circle as it grows, without being re-seated per frame.

## Worked example
**Data shape:** points — per-station rows with real lon/lat and a sized value.

`proof/scrolly-proportional-symbol-europe-capacity/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, cameras, buckets, words), `plan.mjs` (the layers — this type's own marks and `$state` bindings), `DirectedProportionalScrolly.tsx` (the key/counter chrome around the live map) and `symbol-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type proportional-symbol --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/map-beat/references/types/proportional-symbol.md` (read-only, other worktree) and its own video proof under `proof/` there (prefixes vary — `map-`, `mapvid-`, `mapgen-`, `video-`; search by the type's own name) — the same subject's camera moves are often the scrolly's own card-to-card travel, adapted to be scroll-driven rather than timed.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder. Read `references/map-scrolly-state-binding.md` for the `$state` binding contract — what a plan's `bindings` may and may not read, and how buckets replace a feature-driven paint value — before writing this type's own layers.
