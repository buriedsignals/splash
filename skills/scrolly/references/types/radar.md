# Radar (spider) — scrolly

**Argues:** A radar chart plots several variables as axes radiating from a shared centre, each on the SAME radial scale, with one item's readings across all axes joined into a closed polygon — so the shape of that polygon is the read: a balanced item draws a regular shape, a lopsided one draws a spiky or lobsided one.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — the polygon draws itself axis by axis, in order
- **Compare** — two polygons are overlaid and set against each other
- **Name** — an axis's value is named once traced
- **Pull back** — the full polygon stands, named axes still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- every axis keeps the same fixed scale across every card so area is never a silently changing unit

## Devices the worked example implements
- **Progressive polygon trace** — `trace0`/`trace1` draw each country's polygon spoke by spoke, clockwise from twelve o'clock, rather than the whole shape fading in at once — the radar's own "reveal in order" gesture applied to a closed shape instead of a line.
- **Spokes merge to a shared family angle, area kept** — `merge` travels every spoke to its family's own angle and its value to the family's own sum, the same "regroup while conserving what a reader measures" discipline as the marimekko worked example's area-kept column gather, applied to angle and share instead of width.

## Worked example
`proof/scrolly-radar-electricity-mix/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedRadarScrolly.tsx` (the marks) and `radar-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type radar --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/radar.md` (read-only, other worktree) and its `proof/video-radar-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
