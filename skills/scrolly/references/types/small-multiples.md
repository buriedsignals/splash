# Small multiples — scrolly

**Argues:** Small multiples isn't a chart type — it's a layout decision: instead of forcing every group into one crowded chart, repeat the same small chart once per category, panel after panel, all built the same way.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — panels enter one by one, in their natural order
- **Zoom / focus** — one panel grows to fill the frame, then returns to the grid
- **Compare** — two panels are set side by side
- **Pull back** — the whole grid stands, the named panel still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together
- give panels different scales between cards — one shared scale holds across the whole grid

## Precision to assert
- every panel keeps the same axis scale across every card, asserted equal

## Worked example
`proof/scrolly-small-multiples-lowcarbon/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedMultiplesScrolly.tsx` (the marks) and `multiples-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type small-multiples --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/small-multiples.md` (read-only, other worktree) and its `proof/video-small-multiples-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
