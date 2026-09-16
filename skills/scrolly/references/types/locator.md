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

## Devices the worked example implements
- **`keepLabels` — native basemap labels, not beat-drawn ones** — the plan names which of MapTiler's OWN label layers (`"^Country labels$"`, `"^City labels$"`, …) survive the trunk's sweep; the beat's driver (`locator-drive.mjs`) then filters and drives THEIR opacity, rather than re-drawing every place name as a symbol layer. Use whenever the basemap already carries the label treatment the card needs (capitals, settlements, water) — the other seven worked examples all draw their own labels instead, at real cost.
- **Icon-only dot beside a native label** — `place-dots` draws just the marker MapTiler's place labels lack (they carry no icon), leaving the name itself to the native layer above. Pairs with `keepLabels`.
- **Ring that grows on naming** — the subject's ring radius interpolates from a resting size to a "named" size on `$state.subject` (`subjectRadiusPx.rest` → `.named`) — compare the choropleth worked example's "odd ring" and the contour worked example's "summit" callout, the same one-point device with a simpler (interpolate, not case-gated) radius.

## Worked example
**Data shape:** points — named places with real lon/lat.

`proof/scrolly-locator-zaporizhzhia/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, cameras, buckets, words), `plan.mjs` (the layers — this type's own marks and `$state` bindings), `DirectedLocatorScrolly.tsx` (the key/counter chrome around the live map) and `locator-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type locator --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/map-beat/references/types/locator.md` (read-only, other worktree) and its own video proof under `proof/` there (prefixes vary — `map-`, `mapvid-`, `mapgen-`, `video-`; search by the type's own name) — the same subject's camera moves are often the scrolly's own card-to-card travel, adapted to be scroll-driven rather than timed.

**Live MapTiler contract.** A live MapTiler map, flat Web Mercator (`dataviz` style, no controls, `interactive: false`); the scroll owns time, each card carries its own camera and every paint is bound to the card's state. Fills come from MapTiler Countries joined by ISO A2, drawn beneath the basemap's own water (`beneath: "water"`) so the coast a reader sees is the basemap's; every country is present, painted by the basemap even where the study has no data for it. No feature-data bindings — a binding that reads a per-feature property on every frame reloads every tile (`validateScrollyPlan` refuses it); paint is split into layers so every bound opacity is data-constant. A country with no reported value carries the neutral no-data fill and **no in-map label**. `renders/<id>.local.html` inlines the MapTiler key from the environment for local preview (git-ignored); the committed page keeps the placeholder. Read `references/map-scrolly-state-binding.md` for the `$state` binding contract — what a plan's `bindings` may and may not read, and how buckets replace a feature-driven paint value — before writing this type's own layers.
