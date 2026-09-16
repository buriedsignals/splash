# Dumbbell — in video

**Argues:** A dumbbell chart answers "how big is the gap between two values, for each of several categories, and which categories have the biggest gap" — one row per category, two dots (one per series) joined by a connecting line whose LENGTH is the point.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-dumbbell-life-expectancy-gains` (2026-09-15), from `proof/more-dumbbell-life-expectancy-gains`.

- **Start from the earlier state the viewer can read**: the rows ranked by their first value, one dot each; row by row each
  dot travels to the second date (two dates: an arrival, eased), the gap drawn behind it, a count of rises climbing as they land.
- **Re-rank by the change, then compare the changes on one start**: the rows glide into the order of their gaps (every
  other name dims as the rows cross, the subject's does not); a copy of each gap slides onto a common start line — the
  smallest first value, so the subject's copy does not move — as a translation, its length on the same scale; its
  dumbbell steps back while it is away and its change is written as it lands. The staircase is the answer.
- **End on the whole dumbbell**: the copies slide back and merge, every row at full ink, the subject's row ringed, both ends
  of the claim written in the accent; the credit on one line. About 19 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — the value axis and the rows in the order of the FIRST series, with only that series' dots placed
- **`reveal` — trace + count** — row by row the second dot travels out from the first, the connector drawn behind it, and a count of the movers climbs
- **`subject` — reorder + compare** — the rows glide into the order of the GAP, then a copy of every connector detaches and slides onto one shared start line, keeping its length, building a staircase that ranks the gaps without a second chart
- **`conclusion` — pull back** — the copies slide home and merge back into their dumbbells; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- recolour the subject's row — the two series are one hue at two chromas and the subject is RINGED, so the series encoding is never spent on emphasis
- anchor the value axis at zero: the gap is the point, and zeroing the axis compresses every gap the chart exists to show

## Precision to assert
- the drawn connector length equals the asserted computed difference, in every shot and for every copy
- every copy of a gap starts on one shared x and keeps its length exactly
- the order after the reorder is the asserted order of gap, not a hand-kept list

## Devices the worked example implements
- **The staircase of detached gaps** — the ranking of differences is built out of the same marks, so nothing has to be taken on trust (`states.mjs`)
- **Dimming on crossing** — names dim while their rows pass each other, so the reorder stays readable (`DumbbellFrame.tsx`)
- **Two chromas of one hue** — the series pair is a value change, not a category change (`build.mjs`)

## Worked example
`proof/video-dumbbell-life-expectancy-gains/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type dumbbell --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
