# Line — scrolly

**Argues:** A continuous series read against an ordered axis, almost always time, encoded as position and joined into a single stroke that reads as one trend.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Trace** — the line draws itself along its axis, in order
- **Name** — a peak, trough or endpoint is named once reached
- **Rescale** — the axis window travels onto the span the claim is about
- **Pull back** — the whole line stands, named points still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- a gap in the series breaks the line rather than being bridged across missing readings

## Devices the worked example implements
- **Both scales travel together for a focus window** — `zoom` interpolates BOTH axes' domains at once (whole series → last ten years), every mark and label following the moving scales, the plot clipped so the close-up genuinely hides what it leaves out — never a hard cut to a second, separately-scaled chart.

## Worked example
`proof/scrolly-line-swiss-co2/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedLineScrolly.tsx` (the marks) and `line-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type line --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/line.md` (read-only, other worktree) and its `proof/video-line-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
