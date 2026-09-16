# Scatter — in video

**Argues:** A scatter plot answers one question: as one continuous variable moves, what happens to another, across every unit at once.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-scatter-income-life-expectancy` (2026-09-15), from `proof/static-income-life-expectancy`.

- **Start from one measure alone**: every unit packed into one column at the plot's left, each at its own y, pushed only
  along x — the viewer reads the spread before the second measure exists.
- **Unfold along the second measure**: in its order (poorest first), each dot flies horizontally to its x, its height never
  changing; count as they land.
- **Measure the shape by folding**: draw the declared break; the cloud folds against it into one column per side, each dot
  keeping its height, the income ticks stepping back while x means nothing; a bar beside each column over its span, its value.
- **Compare by stacking copies**: copies of the short bar fly one after another beside the long one and stack end to end
  from its low end, on the same y scale — the ratio counted, not written in a sentence.
- **End on the whole cloud**: the dots unfold back, the copies go, the bars stay under the dots with their values; the
  credit on one line beside the x name. 20 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — the two axes, and every observation stacked in ONE column at their meeting: the y readings exist before x is applied
- **`reveal` — unfold + count** — each dot flies horizontally to its own x, keeping its height, in the order of that variable, while a count climbs
- **`subject` — filter + fold + stack** — the declared break is ruled, the cloud folds back against it into two columns, a bar measures each column's span, and copies of the short bar stack onto the long one until they fill it: the ratio is counted, not printed
- **`conclusion` — pull back** — the dots unfold back to their seats, the two measured spans stay; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- spend the accent on a country: this type has a cloud in which no single mark is the argument, so the accent goes on the break and its spans
- let a dot change height at any point — y is fixed from the first shot, and only x is ever applied

## Precision to assert
- both axes keep the same fixed scale in every shot, and a log axis is declared as one
- the break is a declared editorial threshold, printed, and the counts either side of it are derived
- the bar heights are the real spans on the value scale and the stacked copies are the rounded ratio, with the rounding rule stated

## Devices the worked example implements
- **The unfold** — the cloud is built by applying one variable to a column of the other, so the relationship is watched rather than asserted (`states.mjs`)
- **Fold-and-measure** — the two sub-populations are turned into two measurable columns without moving a single y (`ScatterFrame.tsx`)
- **Ratio by stacked copies** — "3 times narrower" is shown as three bars fitting, with the rounding tolerance asserted (`subject.mjs`)

## Worked example
`proof/video-scatter-income-life-expectancy/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type scatter --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
