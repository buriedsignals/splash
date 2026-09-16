# Diverging bar — scrolly

**Argues:** A diverging bar answers "who gained and who lost, and by how much" for a set of categories whose values are SIGNED — net job change by sector, vote swing by district, temperature anomaly by year.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reorder / re-sort** — bars settle into the order that answers the question
- **Compare** — the positive and negative sides are set against the shared zero
- **Name** — the extreme on each side is named
- **Pull back** — the full diverging set stands

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the shared zero baseline never moves between cards

## Worked example
`proof/scrolly-diverging-bar-eu-per-capita/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedDivergingScrolly.tsx` (the marks) and `diverging-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type diverging-bar --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/diverging-bar.md` (read-only, other worktree) and its `proof/video-diverging-bar-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
