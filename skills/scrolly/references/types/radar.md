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

## Worked example
`proof/scrolly-radar-electricity-mix/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/radar.md` (read-only, other worktree) and its `proof/video-radar-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
