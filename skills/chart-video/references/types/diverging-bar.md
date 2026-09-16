# Diverging bar — in video

**Argues:** A diverging bar answers "who gained and who lost, and by how much" for a set of categories whose values are SIGNED — net job change by sector, vote swing by district, temperature anomaly by year.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-diverging-bar-eu-per-capita` (validated 2026-09-14), from `proof/static-diverging-bar-eu-per-capita`.

- **Show where the change comes from**: start from the levels (the first date, from zero), shrink or grow each to the second
  date with the part lost left pale past the new end, then let the levels go and slide every part — keeping its length, one
  scale for levels and changes — across to the zero line, where it becomes the diverging bar.
- **A value too small to see is magnified by the camera**, not asserted by a note: the scale multiplies (geometrically, so
  the move reads at an even pace) around the zero line moved to the middle of the column; every large change runs out of
  the column's clip, the tiny one becomes a length; « ×N » stands in the emptied half. Then the camera pulls back.
- Many rows at the type floor go in columns on one scale; each change stands at its bar's tip; the scale is the largest that
  holds both the highest level and every change with its value.
- The count climbs with the shrinks; the credit is on one line (`CREDIT_ONE_LINE`).

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal in order** — the LEVELS at the first date grow from zero, row after row: the signed change has not been drawn yet
- **`reveal` — shrink + count** — every level travels to its later value, largest fall first, the part lost staying behind as a pale remainder; a count of the falls climbs
- **`subject` — transform + zoom** — each pale remainder slides, keeping its length, across to the zero line and BECOMES the change; then the camera closes hard on the zero line so the single small rise becomes a bar
- **`conclusion` — pull back + name** — the whole chart again, nothing stepped back, the exception ringed; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-move-shared-zero` — move the shared zero baseline between shots, or use a second scale for the levels and the changes
- `no-let-camera-magnification` — let the camera's magnification go unstated: the factor is printed, because a zoom that is not named is a bar that lies about its length

## Precision to assert
- all categories are read in both periods, and the counts of rises and falls are asserted exactly
- one scale (pixels per unit) carries both the levels and the changes, so the transform preserves length
- the magnification factor used to make the exception visible is printed in the frame

## Devices the worked example implements
- **The remainder that becomes the change** — the signed bar is derived on screen from the two levels, so the reader sees the subtraction (`states.mjs`)
- **The stated zoom** — a ×N factor drawn in the frame, which is what licenses magnifying one bar (`DivergingBarFrame.tsx`)
- **Two columns at the type floor** — 27 rows do not hold one column at the floor, so the layout splits and is measured, not guessed (`build.mjs`)

## Worked example
`proof/video-diverging-bar-eu-per-capita/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type diverging-bar --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
