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

## Devices the worked example implements
- **Study land vs. outside-the-measurement land** — land inside the field's own study window gets one neutral fill (`study`); land outside it (cut by the frame, e.g. Russia) gets the basemap's own land colour, named `SWEEP_BENEATH` so the sweep's canvas texture mounts beneath it and its own border edge stays crisp. The continuous-field sibling of the hex-grid's discrete "origin" cell.
- **Median-proximity crossfade** — the line/label nearest the current reading (`L === medianLevel`) fades IN as `$state.median` reaches it while its immediate neighbours (`near`, within 50 of it) fade OUT on the same binding — a "highlight what's closest right now" device, not a fixed highlight.
- **Static seat chosen for the crowded case** — `bestSeatOf` picks each label's seat ONCE, from candidates, by the room it has against every OTHER level's lines simultaneously — valid whichever subset of lines the scroll has drawn so far (fewer visible lines only frees room), so no seat is recomputed per frame.
- **Extremum callout (ring + dot + offset label)** — a found point (`summit`, e.g. the farthest place) gets a ring, a dot and an offset-anchored label, all bound to one `$state.summit` field so they arrive together. Compare the choropleth worked example's "odd ring" and the locator's "subject ring" — the same one-point callout, three implementations.

## Worked example
**Data shape:** per-area — one row per named region (entity/code), no coordinates.

`proof/scrolly-contour-europe-distance/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, cameras, buckets, words), `plan.mjs` (the layers — this type's own marks and `$state` bindings), `DirectedContourScrolly.tsx` (the key/counter chrome around the live map) and `contour-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type contour-isoline --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/map-beat/references/types/contour-isoline.md` (read-only, other worktree) and its own video proof under `proof/` there (prefixes vary — `map-`, `mapvid-`, `mapgen-`, `video-`; search by the type's own name) — the same subject's camera moves are often the scrolly's own card-to-card travel, adapted to be scroll-driven rather than timed.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder. Read `references/map-scrolly-state-binding.md` for the `$state` binding contract — what a plan's `bindings` may and may not read, and how buckets replace a feature-driven paint value — before writing this type's own layers.
