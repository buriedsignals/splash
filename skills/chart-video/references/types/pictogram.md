# Pictogram (unit grid) — in video

**Argues:** A pictogram states a magnitude as a countable row of equal-size icons, where ONE icon always stands for a stated number of units and count — never icon size — carries the value.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-pictogram-europe-lowcarbon` (2026-09-16), from `proof/static-pictogram-europe-lowcarbon`.

- **Start from where each unit sits**: one square a country stands on the measured axis, one column per step, dropped as a
  front sweeps the axis at the data's pace (linear); the fill is the static plate's class ramp, so no key is written.
- **Cut, then part**: the declared cuts rise on column edges; the axis parts at them, each part carrying its columns intact.
- **Gather and count at one pace**: each part's squares settle into columns as tall as the tallest stack, from its anchor
  (the outer edge, or the middle between the cuts), nearest first — nothing is ever set down on a square still standing; the
  j-th square of every block lands at the same moment and each count is its landed squares, so the small block stops first.
- **End on the pictogram**: the parts close together, every square magnified by one factor about its block's corner, a cut
  in the middle of each gap; the counts over the blocks, the lesson's count ringed; the credit on one line. 19 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — trace** — the icons are first placed on a VALUE AXIS, one per unit, a front sweeping the axis at the data's pace, so each icon has a reason to be where it is
- **`reveal` — cut + split** — the thresholds rise in the accent and the axis parts at them, every column keeping its icons: the groups are made by a cut the viewer watches
- **`subject` — gather + count up** — each part settles into blocks of a fixed row length from its own anchor, the j-th icon of every block landing at the same moment, so the counts climb at ONE pace and the smallest group visibly stops first
- **`conclusion` — pull back + name** — the blocks close together and are magnified about their corners, the cuts ruled in the gaps and the claim's count ringed; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- scale an icon to carry a value — count is the encoding, so a bigger icon is a broken one
- let the blocks count at different paces: the counts are only comparable if the j-th icon of every block lands on the same frame

## Precision to assert
- one icon always equals the same stated unit, in every shot
- the groups are exhaustive and disjoint — their counts sum to the whole, asserted
- the magnification at the end is one factor applied about each block's corner, so the blocks keep their shapes

## Devices the worked example implements
- **Icons placed on an axis before being grouped** — the grouping is derived from values rather than asserted (`states.mjs`)
- **Synchronised counting** — blocks fill at one pace so the comparison is visual, not arithmetic (`scene.mjs`)
- **Cuts ruled in the gaps** — the thresholds survive into the final frame as the only numbers on it (`PictogramFrame.tsx`)

## Worked example
`proof/video-pictogram-europe-lowcarbon/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type pictogram --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
