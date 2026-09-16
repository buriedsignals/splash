# Bump — in video

**Argues:** A bump chart answers "who overtook whom, and when" among several competitors ranked over multiple periods — a league table's season, a chart's weekly top-ten, a poll's changing front-runners.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-bump-emitter-rank` (validated 2026-09-15, recut as an argument), from `proof/static-bump-emitter-rank`.

- **Follow the climber**: the camera closes in on the subject's tip (a scale about the tip, holding it at a fixed point of
  the frame) and tracks it while every line advances year by year, linear in years; every line in view carries its name
  at its tip, the year stands in a corner, the subject's rank rides its tip, and each pass happens in close-up between two
  named lines, ringed as it happens. Then the camera pulls back and the whole climb is seen at once, the last names landing.
- A line is drawn only between consecutive years its entity holds a rank; it stops where the entity leaves.
- **The filter comes after the proof** — the entities passed keep the neutral style until the focus — and **the video ends
  on the whole chart**, every line back; the credit on one line. About 20 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — the rank rows and the first period's names, the subject already in the accent at its starting rank
- **`reveal` — track + trace + name** — the camera closes on the subject's tip and TRACKS it while every line advances through the periods; the lines are named at their tips and the subject's current rank rides with it, so each pass happens in close-up between two named lines
- **`subject` — pull back + filter** — the camera returns to the whole chart as the final names land, and everything but the subject and the lines it passed steps back
- **`conclusion` — release** — every line comes back; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- cut to a crossing: a pass is only evidence if the viewer saw both lines arrive at it
- let a competitor that leaves the ranking fade out silently — its line stops where it left, and the stop is drawn

## Precision to assert
- rank at each period is computed from the frozen data and asserted strictly ordered, with no tie silently dropped
- every pass named in the words is derived (a sign change in the rank difference) and asserted, never read off the picture
- the tracking camera's zoom is a stated factor, and the type floor is measured at every event end under it

## Devices the worked example implements
- **The tracking camera** — the frame follows one tip rather than the clock, so the crossings are seen at a readable size (`scene.mjs`, `build.mjs`)
- **Tip labels that travel** — every line carries its name at its own tip, which is what makes a close-up pass legible (`BumpFrame.tsx`)
- **Pass rings fired on the frame they happen** — derived from rank order, not from a hand-entered year (`states.mjs`)

## Worked example
`proof/video-bump-emitter-rank/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type bump --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
