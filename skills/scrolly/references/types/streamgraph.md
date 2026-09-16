# Streamgraph — scrolly

**Argues:** A streamgraph shows many overlapping time series stacked with no fixed baseline — bands can wiggle up and down around a shifting centre rather than growing from a flat zero line — so the READ is the overall rhythm and relative flow of many series at once, not the exact value of any one band at any one point.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — a stream's outline draws itself along the axis, in order
- **Filter** — the stream the claim is about keeps its ink
- **Zoom / focus** — a narrow span grows to print exact values
- **Name** — a stream's value is named once isolated

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together
- ask a reader to compare a stream's thickness against another that isn't adjacent to it

## Precision to assert
- the wiggle baseline is computed once and held fixed across every card, not recentred per card

## Worked example
`proof/scrolly-streamgraph-swiss-electricity/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedStreamScrolly.tsx` (the marks) and `stream-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type streamgraph --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/streamgraph.md` (read-only, other worktree) and its `proof/video-streamgraph-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
