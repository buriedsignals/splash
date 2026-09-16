# Gantt — scrolly

**Argues:** A Gantt chart draws each item as a bar spanning its own start to its own end on one shared, to-scale time axis, one row per item — answering "when did this happen, how long did it take, and what overlapped with what." That's a job a plain event timeline can't do: a timeline of instants can show WHEN something happened but has no way to show DURATION or overlap between concurrent items; a Gantt bar's length is specifically standing in for elapsed time, which is the one thing this type exists to make visible.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — bars enter in start-date order
- **Zoom / focus** — the span the claim is about grows to print its dates
- **Compare** — two bars' durations are set against each other
- **Name** — a bar is named once its span is reached

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- a bar's drawn length is proportional to its real duration in every card, never compressed for fit

## Devices the worked example implements
- **Playhead draws every run up to it, unentered rows stay faint** — `head` (in real years) draws every bar up to that year; a row whose run has not started yet stays faint rather than absent, so the full cast is visible from card one. Compare the bump worked example's identical playhead-by-year device for lines instead of bars.
- **Interrupted runs show their own gap** — a row with a hole in its run (`gaps`) draws the hole outlined rather than as a silent break in the bar, so an interruption reads as a fact about the row, not a rendering gap.

## Worked example
`proof/scrolly-gantt-top-ten-tenure/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedGanttScrolly.tsx` (the marks) and `gantt-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type gantt --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/gantt.md` (read-only, other worktree) and its `proof/video-gantt-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
