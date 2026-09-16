# Calendar heatmap — in video

**Argues:** A calendar heatmap answers "when, across a real calendar, did this value run high or low" by laying one cell per day into a fixed weekday-by-week grid and colouring each cell by its value — the same value-to-colour idea as a matrix heatmap, but with the grid's structure fixed to the calendar itself rather than free to be any two categorical axes.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-calendar-heatmap-geneva` (validated 2026-09-15, recut as an argument), from
`proof/static-calendar-heatmap-geneva`.

- **A calendar is a curve rolled up — show the roll**: draw the period first as its series (a dot a day, linear in days,
  over the threshold line the claim uses, the values over it in the accent, a count climbing as they are drawn); then every
  day falls from its place on the curve into its cell, one after another, growing into it and taking its bin's colour; the
  curve and its line go as the calendar's months, ticks and key come in.
- **The run is traced, not boxed**: the days outside the claim step back; the outline runs along the run a day at a time
  (one rectangle per month, halos drawn before strokes) while its length is counted; the colours come back — the whole
  calendar — the outline kept.
- No close-up when the cell is large enough (about 50 px a day at 1920 × 1080). Credit on one line; about 21 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — trace + count** — the year is drawn FIRST as its ordinary daily curve over a dashed threshold, linear in days, the days above it accented and counted
- **`reveal` — transform** — every day falls from its place on the curve into its calendar cell, growing into it and taking its bin's colour, until the curve has become the grid; the months, day ticks and key arrive with it
- **`subject` — filter + trace + count** — the days under the threshold step back and an outline runs along the longest run one day at a time while its length counts up
- **`conclusion` — pull back** — the colours return, the run still outlined; the credit on one line
- **`hold` — ≈60 frames**. About 21 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- let the colour scale's domain move between shots — a cell's tint must mean the same thing at second 3 and second 20
- start on the grid: the roll from curve to calendar is what earns the type in this format

## Precision to assert
- every day of the period is present and in order, asserted before rendering
- the bins are quantiles of the frozen series, fixed once, and the key prints their breaks
- the run length, the count above the threshold and the number of distinct breaks are derived and asserted

## Devices the worked example implements
- **The roll** — a time series transformed into its calendar, one day at a time, which is the only shot that explains the grid (`states.mjs`)
- **A single-hue quantile key with printed breaks** — colour never has to be discriminated without a number beside it (`CalendarFrame.tsx`)
- **The run outline drawn day by day** — the streak is counted on screen rather than asserted in a caption (`states.mjs`)

## Worked example
`proof/video-calendar-heatmap-geneva/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type calendar-heatmap --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
