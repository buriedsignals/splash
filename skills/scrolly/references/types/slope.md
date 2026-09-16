# Slope (slopegraph) — scrolly

**Argues:** A slope chart answers "who moved, in which direction, and by how much, between exactly two moments" — for many categories at once.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — each line draws itself from its start value to its end value
- **Compare** — the whole set of slopes is set against each other
- **Reorder** — lines that cross are shown crossing, not relabelled in place
- **Name** — a line is named once traced

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- both end columns keep the same shared scale across every card

## Devices the worked example implements
- **Two precomputed label layouts, crossfaded** — labels are seated TWICE (once relaxed for all sixteen lines, once for the six the static plate keeps) and the card crossfades between the two precomputed seatings, rather than re-relaxing labels live as lines drop out — keeps a set change from ever producing a mid-transition label collision.

## Worked example
`proof/scrolly-slope-europe-lowcarbon/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedSlopeScrolly.tsx` (the marks) and `slope-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type slope --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/slope.md` (read-only, other worktree) and its `proof/video-slope-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
