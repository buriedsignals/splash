# Choropleth — scrolly

**Argues:** A choropleth answers "which of these named regions is proportionally worse or better off," where the regions are a partition the reader already recognises — countries, states, districts.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography. A map close-up centres the subject, both axes.

## Scroll gestures
- **Reveal in order** — colour classes arrive one by one, lowest first, with the key
- **Filter + count** — countries under the floor step back to bare land while a running count climbs
- **Zoom + name** — the camera closes on the region the card names, both axes, while it is ringed and labelled
- **Pull back** — Europe returns whole, every class and named country still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- fills come from MapTiler Countries joined by ISO A2, every country present at the whole-map camera
- a country with no reported value carries the neutral no-data fill and no in-map label
- **the join-against-real-tiles check is NOT skippable in fast mode.** `assertJoin` in the worked example
  (`proof/scrolly-choropleth-europe-lowcarbon/render-directions-scrolly.mjs`) queries MapTiler Countries once,
  before any card renders, and throws by name if a studied country has no polygon at the whole-map camera —
  a dropped join otherwise shows bare land where the data has a value, with nothing saying so. It runs
  unconditionally, `--no-bake` included: it is one query against already-open tiles (`cards.mapPage()`), not
  part of the bake, so there is no fast-mode cut that removes it.

## Devices the worked example implements
- **Odd-one ring, revealed at two travel moments** — one named outlier gets a stroked ring, its opacity the MAX of `arrived` (camera has just closed in — the last quarter of an eased travel) and `atRest` (camera sits still — its own first 8%), so it never shows mid-travel. Compare the contour worked example's "summit" and the locator's "subject ring" — the same one-point callout.
- **Two-moment word reveal** (`arrived`/`atRest`, both eased curves over `$state.zoom`) — a name only shows once its camera has EITHER just arrived at a close-up or is sitting still at the whole map, never while the camera is moving between them. Use for any label bound to a travelling camera.
- **No-data fill arrives WITH the classes** — the missing-fill layer's opacity is bound to the same `$state.classes` field the colour classes use (`clamp(classes × classFills.length)`), so a no-data country's neutral tint appears exactly when the first class does, not before.

## Worked example
**Data shape:** per-area — one row per named region (entity/code), no coordinates.

`proof/scrolly-choropleth-europe-lowcarbon/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, cameras, buckets, words), `plan.mjs` (the layers — this type's own marks and `$state` bindings), `DirectedChoroplethScrolly.tsx` (the key/counter chrome around the live map) and `choropleth-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type choropleth --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/map-beat/references/types/choropleth.md` (read-only, other worktree) and its own video proof under `proof/` there (prefixes vary — `map-`, `mapvid-`, `mapgen-`, `video-`; search by the type's own name) — the same subject's camera moves are often the scrolly's own card-to-card travel, adapted to be scroll-driven rather than timed.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder. Read `references/map-scrolly-state-binding.md` for the `$state` binding contract — what a plan's `bindings` may and may not read, and how buckets replace a feature-driven paint value — before writing this type's own layers.
