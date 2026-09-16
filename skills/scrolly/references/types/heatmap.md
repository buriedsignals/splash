# Heatmap (matrix) — scrolly

**Argues:** A heatmap lays a grid across two categorical (or temporal) dimensions — day by hour, region by year — and encodes a third, quantitative value as the colour of each cell.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — rows or columns fill in their natural order
- **Filter** — the row or column the claim is about keeps its ink
- **Zoom / focus** — one cell or block grows to print its exact value
- **Name** — the extreme cell is named

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the colour scale's domain is fixed across every card

## Worked example
`proof/scrolly-heatmap-coal-share-europe/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedCoalHeatmapScrolly.tsx` (the marks) and `coal-heatmap-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type heatmap --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/heatmap.md` (read-only, other worktree) and its `proof/video-heatmap-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
