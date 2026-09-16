# Box plot — scrolly

**Argues:** A box plot compresses a distribution into a five-number summary — minimum, first quartile, median, third quartile, maximum — and draws it as a box with whiskers, one per category.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Compare** — two or more boxes are set side by side or summarised together
- **Filter** — the decade or group the claim is about keeps its ink
- **Zoom / focus** — one box grows to print its quartiles and outliers
- **Pull back** — every box stands together, the compared pair still named

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- quartiles and whiskers are computed from the frozen data in the runner, never eyeballed
- an outlier shown on a zoomed box is a real point in the file, plotted at its true value

## Devices the worked example implements
- **Points regroup into a box, outliers stay as points** — every raw point travels from its place in time to its decade's column (`group`); the column then closes into a box — quartiles, median, whiskers — and every point steps back EXCEPT the outliers, which stay visible as points against the closed box (`box`). Use whenever a summary shape should not erase the raw evidence a reader would ask to see.

## Worked example
`proof/scrolly-boxplot-france-co2-decades/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedBoxplotScrolly.tsx` (the marks) and `boxplot-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type boxplot --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/boxplot.md` (read-only, other worktree) and its `proof/video-box-plot-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
