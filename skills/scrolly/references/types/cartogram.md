# Cartogram (area distortion — and tile cartogram) — scrolly

**Argues:** A cartogram answers "how big is this region's VALUE," honestly, by distorting each region's own area to be proportional to a number — trading recognisable geography for magnitude a reader can compare at a glance.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography. A map close-up centres the subject, both axes.

## Scroll gestures
- **Rescale** — each region's area distorts toward its value, in a controlled sequence
- **Filter** — the region the claim is about keeps its ink
- **Zoom / focus** — the close-up centres the region the card names, both axes
- **Pull back** — the full distorted map stands, named regions still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- every country is present at every card, including the ones the claim ignores; area distortion is computed from the same asserted value at every step

## Worked example
`proof/scrolly-cartogram-europe-lowcarbon/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, cameras, buckets, words), `plan.mjs` (the layers — this type's own marks and `$state` bindings), `DirectedCartogramScrolly.tsx` (the key/counter chrome around the live map) and `cartogram-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type cartogram --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/map-beat/references/types/cartogram.md` (read-only, other worktree) and its own video proof under `proof/` there (prefixes vary — `map-`, `mapvid-`, `mapgen-`, `video-`; search by the type's own name) — the same subject's camera moves are often the scrolly's own card-to-card travel, adapted to be scroll-driven rather than timed.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder. Read `references/map-scrolly-state-binding.md` for the `$state` binding contract — what a plan's `bindings` may and may not read, and how buckets replace a feature-driven paint value — before writing this type's own layers.
