# Parallel coordinates — scrolly

**Argues:** Parallel coordinates lay several variables out as parallel vertical axes, each keeping its OWN independent scale, with one item drawn as a single polyline crossing every axis in turn — so the crossing pattern of many items' lines reveals trade-offs a table of the same numbers hides: an item that's high on one axis and low on the next shows up as a visibly steep diagonal, and a cluster of similarly-shaped items shows up as a bundle of near-parallel lines.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — a case's own line draws itself across the axes in order
- **Filter** — the case or cluster the claim is about keeps its ink
- **Reorder** — axes settle into the order that answers the question
- **Name** — a case is named once traced

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- each axis keeps its own fixed scale across every card so a line's slope always means the same thing

## Devices the worked example implements
- **The axis set itself grows** — `span` adds axes one at a time (one to all seven), the lines growing toward each new axis as it arrives and the whole block widening continuously to make room — not only the lines animate, the coordinate system itself does.
- **Intersection of two filters, accented** — `accent` picks only the lines clearing BOTH named floors (`groupN` and `groupW`'s own thresholds), drawn thicker in the accent while every other line retreats — a "combine two single-axis filters into one accented set" device.

## Worked example
`proof/scrolly-parallel-coordinates-electricity-mix/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedParallelScrolly.tsx` (the marks) and `parallel-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type parallel-coordinates --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/parallel-coordinates.md` (read-only, other worktree) and its `proof/video-parallel-coordinates-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
