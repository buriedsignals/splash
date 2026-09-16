# Area (and stacked area) — scrolly

**Argues:** A single-series area chart is a line chart with the space beneath it filled.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — the curve draws itself along its own axis, in order
- **Fill + count up** — the surface fills while the running stock climbs beside it
- **Rescale** — the axis window travels onto the span the claim is about
- **Pull back** — the whole series returns, both halves or the accent named

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together
- invent a smooth fill across a gap nobody measured

## Precision to assert
- the window is a viewBox travel, not a redraw: every label re-seats inside the current window
- a word waits for its own line — it appears once the trace reaches it
- the value axis keeps its zero baseline in every card

## Worked example
`proof/scrolly-area-swiss-co2/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedAreaScrolly.tsx` (the marks) and `area-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type area --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/area.md` (read-only, other worktree) and its `proof/video-area-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
