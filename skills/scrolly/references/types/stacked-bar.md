# Stacked bar — scrolly

**Argues:** Several series summed into one bar per category, so a single mark carries both the total (the bar's full length) and the composition (each segment's own length within it).

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Filter** — the segment the claim is about keeps its ink
- **Compare** — two bars' segments are set against each other
- **Name** — a segment's share is named once isolated
- **Pull back** — the whole stack returns, every segment still legible

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together
- ask a reader to compare a middle segment's thickness across bars — restrict that comparison to the bottom segment or the total

## Precision to assert
- segment order (bottom to top) is fixed across every card; shares sum to the same asserted total

## Worked example
`proof/scrolly-stacked-bar-lowcarbon-growth/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedStackedScrolly.tsx` (the marks) and `stacked-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type stacked-bar --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/stacked-bar.md` (read-only, other worktree) and its `proof/video-stacked-bar-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
