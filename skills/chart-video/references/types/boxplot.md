# Box plot — in video

**Argues:** A box plot compresses a distribution into a five-number summary — minimum, first quartile, median, third quartile, maximum — and draws it as a box with whiskers, one per category.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-box-plot-france-co2-decades` (2026-09-15), from `proof/more-boxplot-france-co2-decades`.

- **Start from the readings a box summarises**: every annual reading appears in its order, at its year inside its group's
  slot and at its value (a partial group fills only part of its slot). Group after group, the readings slide sideways into
  one column, keeping their heights.
- **Draw the box out of the column**: the median through it, the box opening from the median to Q1 and Q3, the whiskers to
  the furthest readings inside the fence (the static beat's own summary function, never a copy), the reading past a whisker
  ringed; then the box, whiskers and ring lift out beside the readings that stay.
- **Compare with one mark sliding onto the others**: a copy of the first median, in the accent, slides to each next box at its
  own height and climbs or drops onto that median; the peak lights when it lands, its value printed once the walker has left.
- **End on the whole box plot**: the walker dissolves into the last median; every box beside its readings, the peak in the
  accent, the two medians printed, the credit on one line.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal in order** — the value axis and the category slots, then every raw reading appearing in its own order at its own height, so the summary has visible parents
- **`reveal` — gather + split** — category after category the readings slide sideways into one column, the median draws through them, the box opens to Q1 and Q3, the whiskers run to the furthest readings inside the fence, the one beyond is ringed, and the built box lifts out BESIDE its readings rather than replacing them
- **`subject` — compare (slide onto)** — one median mark in the accent walks from box to box at its own height and climbs or drops onto each next median, so the trend is a single travelling mark
- **`conclusion` — pull back** — the walking mark dissolves into the last box's own; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- draw the box before its readings — the type's whole risk is a summary taken on trust, and the video exists to show where it came from
- hide a partial category: a decade with five years fills half its slot and is named by its span, rather than being padded or dropped

## Precision to assert
- quartiles, the Tukey fence and the fence-clipped whiskers are computed by the static sibling's own `summarizeDecade`, never eyeballed
- a ringed outlier is a real reading in the frozen file, plotted at its true value
- the number of readings, the count of full and partial categories, and the direction of every step between medians are asserted in the runner

## Devices the worked example implements
- **Readings kept beside the box** — the summary never erases its evidence, so the final frame carries both (`BoxplotFrame.tsx`)
- **The walking median** — one accented copy slides from summary to summary, turning six comparisons into one continuous move (`states.mjs`)
- **Fence-clipped whiskers** — the whisker stops at the furthest reading inside the fence, and only what is past it is ringed (`subject.mjs`)

## Worked example
`proof/video-box-plot-france-co2-decades/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type boxplot --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
