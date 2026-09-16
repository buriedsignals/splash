# Population pyramid — in video

**Argues:** A population pyramid is two back-to-back bar charts sharing a central category axis: ordered bands run up the middle, one group's bars extend left, the other's right, each bar's length a magnitude on the same scale.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-population-pyramid-swiss-age`, from `proof/static-swiss-age-pyramid`.

- **Show where the crossing comes from**: the pyramid grows out of the spine band after band from the foot; then every
  bar of one half slides across the spine onto the other, keeping its length — the two halves compared on one side. The part
  both share turns neutral and leaves; what is left, the difference, slides to the spine on the side of the group that has it.
- **A difference too small to see is magnified by the camera** around the spine (geometric, a round factor from the data);
  the whole scale's ticks run out while the close scale's arrive at the same places (100k → 10k at ×10). A rule between the
  last band one group leads and the first the other does; the two differences either side print their values, bare.
- **End on the whole pyramid**: the camera back, the shared part grows out of the spine on both sides again, pushing each
  difference to its bar's end; the rule kept, the credit on one line under the ticks. Every band named if its ink holds the pitch.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal in order** — the bands grow out of the spine from the foot upward, both sides on one scale
- **`reveal` — compare + split** — one half's bars slide ACROSS the spine onto the other's, keeping their lengths; the part both share turns neutral and leaves, and only the difference stays, on the side of whichever leads
- **`subject` — zoom + name** — the scale multiplies about the spine (the ticks change with it) and a rule is drawn at the band where the difference changes side, the two neighbouring differences printing their values
- **`conclusion` — pull back + rebuild** — the camera returns to ×1 and the shared part grows back out of the spine, pushing each difference out to its bar's end; the rule stays; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- move the shared centre axis, or let the two sides take different scales in any shot
- magnify without printing the factor: the crossing is a third of a pixel at ×1, so the ×N is part of the evidence

## Precision to assert
- the shared centre never moves and both sides keep the same scale in every shot
- each difference drawn is the absolute difference of the two bands, placed on the leader's side, and the crossing band is computed (`mirrorCrossingKey`), not chosen
- the bands sum to the asserted population total

## Devices the worked example implements
- **Fold-and-keep-the-difference** — the comparison is made on one side, which is the only way a sub-pixel crossing becomes visible (`states.mjs`)
- **A printed magnification** — ×10 about the spine with the ticks rescaled with it (`PyramidFrame.tsx`)
- **Rebuild from the shared part** — the pyramid is put back by growing the common half, so the final frame is the ordinary chart (`states.mjs`)

## Worked example
`proof/video-population-pyramid-swiss-age/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type population-pyramid --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
