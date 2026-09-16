# Calendar heatmap — scrolly

**Argues:** A calendar heatmap answers "when, across a real calendar, did this value run high or low" by laying one cell per day into a fixed weekday-by-week grid and colouring each cell by its value — the same value-to-colour idea as a matrix heatmap, but with the grid's structure fixed to the calendar itself rather than free to be any two categorical axes.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — cells fill in calendar order, day by day or month by month
- **Filter** — the period the claim is about keeps its ink
- **Zoom / focus** — one month or week grows to print exact values
- **Name** — the extreme cell is named once reached

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- the colour scale's domain is fixed across every card so a cell's tint never means something different mid-scroll

## Worked example
`proof/scrolly-calendar-heatmap-geneva/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedCalendarScrolly.tsx` (the marks) and `calendar-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type calendar-heatmap --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/calendar-heatmap.md` (read-only, other worktree) and its `proof/video-calendar-heatmap-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
