# Gantt — in video

**Argues:** A Gantt chart draws each item as a bar spanning its own start to its own end on one shared, to-scale time axis, one row per item — answering "when did this happen, how long did it take, and what overlapped with what."

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-gantt-top-ten-tenure` (validated 2026-09-15, recut), from `proof/static-gantt-top-ten-tenure`.

- **Sweep the time with a cursor**: a year cursor crosses the rows, linear in years, the year riding it under the rows
  (the ticks give way while it moves); on it, the seats of that year are marked on the rows that hold them — the seats are
  seen changing hands while the bars grow behind the cursor. A span that stops is seen stopping, an interruption is seen as
  a gap opening.
- **A count that falls is the claim happening**: the entities of the first year that have held every year the clock has
  fully crossed; the name of the one that left is muted at the frame the count drops. Entities absent at the start are
  muted from the start.
- **The filter comes after the clock**, and **the video ends on the whole chart**, every row back, the rows the title is
  about kept in the accent; the credit on one line. About 18 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — every row empty, the names present, the ones that exist at the first date in ink and the later entrants muted
- **`reveal` — sweep + trace + count** — a year cursor runs the whole axis LINEARLY, the date riding under it and the occupied slots marked on it; the bars grow behind it, so a bar that STOPS is seen stopping, and a count falls at the exact moment one does
- **`subject` — filter** — the rows the claim is about take the accent, the rest step back
- **`conclusion` — release** — everything returns with the claim's rows still accented; the credit on one line
- **`hold` — ≈60 frames**. About 18 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- compress a bar to make it fit — length is elapsed time, so a shortened bar is a falsified duration
- ease the year cursor: the axis is measured, so its traversal is linear or the pace of the story is a lie

## Precision to assert
- a bar's drawn length is proportional to its real duration in every frame
- the runs are computed from the frozen data (consecutive spells, interruptions kept as gaps) and the row order is derived, not hand-kept
- the count's every step is tied to the year the data says it happens

## Devices the worked example implements
- **The running clock** — the axis is swept rather than revealed, which is the one thing a still cannot do with a duration (`states.mjs`, `scene.mjs`)
- **Seats marked on the cursor** — membership at the cursor's date is drawn, so a hand-over is visible as it happens (`GanttFrame.tsx`)
- **Interruptions kept as holes** — an interrupted row shows its gap rather than being merged into one span (`subject.mjs`)

## Worked example
`proof/video-gantt-top-ten-tenure/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type gantt --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
