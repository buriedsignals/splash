# Bump (ranking-over-time) — scrolly

**Argues:** A bump chart answers "who overtook whom, and when" among several competitors ranked over multiple periods — a league table's season, a chart's weekly top-ten, a poll's changing front-runners.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — each line draws itself across the ranked steps in order
- **Reorder** — ranks that swap are shown swapping, not relabelled in place
- **Name** — a line is named at the rank the card is about
- **Pull back** — every line's full rank history stands

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together
- let two crossing lines' labels collide — reseat them per card

## Precision to assert
- rank at each step is computed from the frozen data, asserted strictly ordered with no ties silently dropped

## Worked example
`proof/scrolly-bump-emitter-rank/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedBumpScrolly.tsx` (the marks) and `bump-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type bump --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/bump.md` (read-only, other worktree) and its `proof/video-bump-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
