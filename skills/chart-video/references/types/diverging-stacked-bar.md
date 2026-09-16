# Diverging stacked bar — in video

**Argues:** A diverging stacked bar answers "how did opinion split, for many items at once, when the response scale itself has a neutral middle" — a survey's strongly-disagree-to-strongly-agree results, one row per question, segments stacked outward from a shared centre instead of from a shared zero.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-diverging-stacked-electricity` (2026-09-15), from `proof/static-diverging-stacked-electricity`.

- **The lean is a whole bar re-anchored, so start from the whole bars**: each row's 100 % mix grows from one left edge, row after
  row (linear), its levels in the order they will diverge — the deepest step of one side at the left end, of the other at the right.
- **Slide, don't redraw**: every bar travels unchanged until the neutral's middle is on the anchor (a row with no neutral whose
  boundary already sits there does not move); the anchor, the side names and each row's totals at its ends arrive as it lands.
  The scale holds the widest lean on each side, and the plot's left edge is where the furthest left lean begins.
- **Weigh the neutral against both sides**: the other rows step back, the subject's bar parts into two tracks inside its own row
  (neutral up, sides down), and its two sides slide, lengths kept, end to end from the neutral's left edge — the sum printed where
  they stop. Draw the anchor under the bars so it never cuts a share printed on it.
- **End on the whole chart**: the sides slide back, the bar closes, the rows return, the neutral ringed; the credit on one line.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal in order** — every row is first an ORDINARY 100 % bar growing from one shared left edge, the segments in their fixed order
- **`reveal` — re-anchor** — each bar slides, every length kept, until its neutral middle segment straddles the anchor; the anchor and the side names arrive, and the lean appears without a mark changing size
- **`subject` — compare** — the other rows step back and the subject's bar parts: the middle up, the two sides down and laid end to end from the middle's edge, where they stop short (or overrun) against it
- **`conclusion` — pull back + name** — the sides slide home, the bar closes, the rows return and the subject's middle is ringed; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-re-anchor-redrawing` — re-anchor by redrawing: the slide must preserve every segment's length, or the lean is an artefact of the shot rather than of the data
- `no-change-segment-order` — change the segment order between rows or between shots — the order IS the response scale

## Precision to assert
- every row sums to the same asserted total in every shot
- one scale (pixels per point) for every length, in every shot, including the laid-out comparison
- the compared sum is arithmetic on the frozen shares and is asserted against the segment it is measured on

## Devices the worked example implements
- **The re-anchor slide** — the diverging chart is derived from the plain 100 % bar the reader already understands (`states.mjs`)
- **Sides laid end to end** — "more than both together" is shown as a length, so no sentence has to claim it (`DivergingStackFrame.tsx`)
- **An anchor with side names instead of ticks** — every length carries its own value, so the axis is dropped (`build.mjs`)

## Worked example
`proof/video-diverging-stacked-electricity/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type diverging-stacked-bar --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
