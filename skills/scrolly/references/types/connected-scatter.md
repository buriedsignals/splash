# Connected scatter — scrolly

**Argues:** A connected scatter answers "what path did these two measures trace together, over time" — unlike a plain scatter, whose points have no inherent order, here each point IS ordered (usually by time) and the points are joined into a single path, so loops, reversals, and doubling-back all become visible shapes instead of a static cloud.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — the path draws itself in the order of its own axis, usually time
- **Name** — a turning point or endpoint is named once the trace reaches it
- **Zoom / focus** — a tangled loop grows to show its own order clearly
- **Pull back** — the whole path stands, endpoints and turns still named

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the path's drawn order matches the data's own ordering axis exactly, asserted in the runner

## Devices the worked example implements
- **Eight-offset label placement, degrading to a code** — each point's name tries eight offsets around its own disc in priority order (subject first, then the current card's own countries, then the rest by weight); a name that fits nowhere degrades to its three-letter code, and is dropped only when neither fits (`scatter-drive.mjs`). The general point-label declutter rule for any crowded point field.

## Worked example
`proof/scrolly-connected-scatter-lowcarbon/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedScatterScrolly.tsx` (the marks) and `scatter-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type connected-scatter --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/connected-scatter.md` (read-only, other worktree) and its `proof/video-connected-scatter-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
