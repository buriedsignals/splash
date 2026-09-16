# Waterfall (bridge) — scrolly

**Argues:** A waterfall chart shows how a starting total arrives at an ending total through a sequence of signed steps — a revenue build, a budget variance, an opening-to-closing balance.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — deltas enter in their sequence, running total updating
- **Count up** — the running total climbs or falls with each delta
- **Name** — a delta's value is named once it lands
- **Pull back** — the whole bridge stands, start and end totals still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the running total after every delta is computed and asserted arithmetically consistent with the frozen data

## Devices the worked example implements
- **One slot unfolds into several** — `unfold` widens a single step's column into three (one bar per fuel) as it opens, rather than cutting to a separate breakdown chart — the waterfall's own instance of the "one becomes many, continuously" family (compare the dot-strip's split and the diverging-stacked-bar's opened row).
- **Net-change bracket spans the middle steps** — `net` draws a bracket carrying the opening level across to the closing total, bypassing the intermediate steps visually while they step back — a "connect a start and an end across steps that are momentarily not the point" device.

## Worked example
`proof/scrolly-germany-electricity-bridge/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedBridgeScrolly.tsx` (the marks) and `bridge-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type waterfall --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/waterfall.md` (read-only, other worktree) and its `proof/video-waterfall-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
