# Dumbbell (range plot) — scrolly

**Argues:** A dumbbell chart answers "how big is the gap between two values, for each of several categories, and which categories have the biggest gap" — one row per category, two dots (one per series) joined by a connecting line whose LENGTH is the point.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Compare** — the two endpoints of each pair are set against each other
- **Reorder / re-sort** — pairs settle into the order of their own gap
- **Name** — the gap's value is named once the pair is reached
- **Pull back** — every pair stands, the named ones still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the gap length drawn between the two dots equals the asserted computed difference

## Devices the worked example implements
- **Playhead reads a value between two years** — a `year` field between two real years positions each row's head dot by interpolating between the actual values at the years either side, not by a straight visual tween — the read stays true at any scrub position, not just at the two named years.
- **Ghost of a past value, dashed** — the 2019 value is left behind as a dashed ring once the head dot moves on (`ghost`), so a reader still sees where a row used to be. Compare the wind-vs-solar (grouped-bar) worked example's identical device for a prior year's same metric.

## Worked example
`proof/scrolly-dumbbell-life-expectancy-gains/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedDumbbellScrolly.tsx` (the marks) and `dumbbell-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type dumbbell --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/dumbbell.md` (read-only, other worktree) and its `proof/video-dumbbell-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
