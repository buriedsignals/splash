# Slope — in video

**Argues:** A slope chart answers "who moved, in which direction, and by how much, between exactly two moments" — for many categories at once.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-slope-europe-lowcarbon` (validated 2026-09-15, recut as an argument), from
`proof/static-slope-europe-lowcarbon`.

- **Draw every line the frame holds**: all of them if every rail's labels fit at a legible pitch (the two-pass spread,
  pushed, never dropped, never reordered, a hairline back to the rail).
- **Count the claim as it lands**: the lines are drawn to the second rail one after another (two dates: each eased), and a
  count of the ones that rose climbs as they land.
- **Run the test the title makes**: the line to beat takes the accent; the lines that could beat it (those that started
  under it) are tried one after another, lowest finish first — each lights up and falls back under it, until the one that
  ends above is tried last, takes the accent and has its crossing (derived, never believed on sight) ringed; a count of
  passes stops at its value. Lines out of the test step back as it begins.
- **End on the whole chart**: every line back, the pair in the accent, the crossing ringed; the credit on one line. About
  19 s. A move's landing is tested at 1 − ε: floating point leaves the last staggered move a hair short of 1.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — both rails, with each category's first dot, name and value seated at a legible pitch
- **`reveal` — trace + count** — the lines are drawn to the second rail one after another, largest rise first, while a count climbs
- **`subject` — test + count** — the reference line takes the accent and becomes the bar to clear; every candidate that started under it is TRIED in turn, lowest finish first, lighting up and falling back, until the one that ends above is tried last and has its crossing ringed
- **`conclusion` — pull back** — every line comes back with the pair accented; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-drop-category-make` — drop a category to make the labels fit — the labels are pushed apart to a legible pitch, and a direction whose registers cannot seat them refuses the render
- `no-believe-crossing-sight` — believe a crossing on sight: a pass is a sign change in the gap, computed, and the ring is placed at the solved parameter

## Precision to assert
- both end columns keep the same shared scale in every shot
- every line carries both its numbers, since there is no value axis
- the count of risers and the single pass are derived from the frozen file and asserted

## Devices the worked example implements
- **The test run** — candidates tried one at a time against the reference, which turns "only one passed" into something watched (`states.mjs`)
- **Pushed, never dropped labels** — the pitch is measured and the render refuses rather than truncate (`build.mjs`)
- **The solved crossing** — the ring sits at the parameter where the two lines actually meet (`subject.mjs`)

## Worked example
`proof/video-slope-europe-lowcarbon/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type slope --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
