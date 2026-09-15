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

## Worked example
`proof/scrolly-boxplot-france-co2-decades/BRIEF.md` — read its choreography table and precision section before writing a new one.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/box-plot.md` (read-only, other worktree) and its `proof/video-box-plot-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
