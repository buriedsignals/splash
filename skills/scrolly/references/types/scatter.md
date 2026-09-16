# Scatter (and bubble) — scrolly

**Argues:** A scatter plot answers one question: as one continuous variable moves, what happens to another, across every unit at once.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — points enter, e.g. by date or rank
- **Filter** — the cluster or outlier the claim is about keeps its ink
- **Zoom / focus** — a crowded region grows to separate close points
- **Name** — an outlier or trend is named

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- both axes keep the same fixed scale across every card so a point's position never silently shifts what it means

## Devices the worked example implements
- **Scale TYPE re-encode, not just a zoom** — `log` interpolates the income axis continuously from linear to logarithmic, every point sliding to its new x on the same field — a deliberate, driven change of the scale's own kind (not its domain), narrated by the card that owns it, distinct from the ordinary zoom-into-a-window gesture.

## Worked example
`proof/scrolly-scatter-income-life-expectancy/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedIncomeScatterScrolly.tsx` (the marks) and `income-scatter-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type scatter --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/scatter.md` (read-only, other worktree) and its `proof/video-scatter-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
