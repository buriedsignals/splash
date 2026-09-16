# Population pyramid — scrolly

**Argues:** A population pyramid is two back-to-back bar charts sharing a central category axis: ordered bands run up the middle, one group's bars extend left, the other's right, each bar's length a magnitude on the same scale.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Compare** — the two sides are set against the shared centre axis
- **Reveal in order** — age bands fill from one end
- **Name** — a band's value is named once reached
- **Pull back** — the whole pyramid stands, named bands still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the shared centre axis never moves and both sides keep the same scale in every card

## Worked example
`proof/scrolly-swiss-age-pyramid/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedPyramidScrolly.tsx` (the marks) and `pyramid-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type population-pyramid --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/population-pyramid.md` (read-only, other worktree) and its `proof/video-population-pyramid-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
