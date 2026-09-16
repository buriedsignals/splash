# Small multiples — in video

**Argues:** Small multiples isn't a chart type — it's a layout decision: instead of forcing every group into one crowded chart, repeat the same small chart once per category, panel after panel, all built the same way.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-small-multiples-lowcarbon` (2026-09-16), from `proof/static-small-multiples-lowcarbon`.

- **Cut the grid out of one chart**: the earlier bars grow side by side in one row on one baseline, then the row is cut —
  each bar travels to its own panel keeping its height, its stretch of baseline shrinking to the panel's own, its name
  arriving. The one scale is shown, not stated.
- **Grow the later state out of the earlier one**: panel after panel a copy slides out of the earlier bar and rises to its
  later value, the gain counting beside the pair.
- **Pull the change down and re-sort**: every added part drops to the baseline beside where its panel started, and the
  panels re-sort by that start, all at once — moved one after another they land on cells not yet left.
- **End on the whole grid**: the parts climb back onto their levels, the two panels the claim names ringed; the credit on
  one line; about 18,4 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal in order → split** — the categories are first ONE row on one baseline and one scale; the row is then cut, each mark travelling to its own panel with its stretch of baseline shrinking to the panel's, its name arriving: the grid is derived from a single chart
- **`reveal` — copy slides out + grows + count** — panel after panel the later value slides out beside the earlier one and rises, with its change counted beside it
- **`subject` — detach → reorder** — in every panel the added part drops to the baseline, and the panels re-sort by the variable the claim is about, so the relationship shows as a shape across the grid
- **`conclusion` — pull back + name** — the parts climb back onto their levels and the two extreme panels are ringed; the credit on one line
- **`hold` — ≈60 frames**. About 18 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- give a panel its own scale — every panel keeps the same axis scale, asserted equal, in every shot
- re-sort the grid without a reason the claim needs: the order is itself the finding here

## Precision to assert
- every panel keeps the same axis scale across every shot, asserted equal
- each mark keeps its height through the cut from one row into the grid
- the correlation or ranking the reorder shows is computed from the frozen file and asserted

## Devices the worked example implements
- **One row cut into a grid** — the panels are shown to be the same chart, which is the layout's whole claim (`states.mjs`)
- **Added parts dropped to a common baseline** — the panel-to-panel comparison is made without a second chart (`SmallMultiplesFrame.tsx`)
- **Panel re-sort** — the relationship between start and gain is drawn as a slope across the grid (`states.mjs`)

## Worked example
`proof/video-small-multiples-lowcarbon/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type small-multiples --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
