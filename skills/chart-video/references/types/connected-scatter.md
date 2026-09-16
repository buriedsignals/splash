# Connected scatter — in video

**Argues:** A connected scatter answers "what path did these two measures trace together, over time" — unlike a plain scatter, whose points have no inherent order, here each point IS ordered (usually by time) and the points are joined into a single path, so loops, reversals, and doubling-back all become visible shapes instead of a static cloud.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-connected-scatter-lowcarbon` (validated 2026-09-15, recut), from
`proof/static-connected-scatter-lowcarbon`.

- **Explain the axes with the marks**: each entity first arrives as a bar from zero to its x value at the height of its y
  value, then collapses into its right end — the first-date ring. « Far right » is seen to mean « a long bar ».
- **Make the move happen**: each entity leaves its ring and slides along its arc (a quadratic that bows by a capped share
  of its chord) to its disc, one after another, a count of the landed ones climbing.
- **A crowd near the origin gets the close-up**: the x domain closes (seats and arcs laid out again every frame), names
  seated twice in Bun — once per scale — one set of ticks at a time; the camera pulls back.
- **The filter comes after the proof** (the entities the claim is about picked one after another, the subject's arc split
  into its two moves, each leg with its value), and **the video ends on the whole chart**, every entity back, the picks and
  legs still marked. A credit sharing its row with an axis name takes the measure that row leaves, the shorter form.
- Names: subject first (its seat must hold at its first-date ring too), then the picked, then the rest — beside the disc,
  pushed with a leader that crosses no word, disc or leg, then the code. About 24 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — explain** — the two axes are built rather than announced: one variable grows as a bar from zero at the height of the other, then every bar collapses into its right end to become the starting point
- **`reveal` — trace + count** — the items travel one after another along their own arcs from first to last observation, biggest move first, and a count climbs as each lands
- **`subject` — zoom** — one axis closes onto the crowd near the origin; the items that leave the frame are the ones the claim already names, and every item inside is labelled
- **`conclusion` — pull back + filter + name + release** — the full axis returns, the sub-claim's items are picked out one at a time, the subject's arc is split into its two legs with their values, then every item comes back; the credit on one line
- **`hold` — ≈60 frames**. About 24 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-draw-path-order` — draw the path in any order but the data's own ordering axis
- `no-leave-zoom-last` — leave the zoom as the last word — the claim is about all of the items, so the shot returns to the full scale before the hold

## Precision to assert
- the drawn order of each path matches the data's ordering axis exactly, asserted in the runner
- the zoom's window is stated, and which items fall outside it is an asserted consequence of the data, not a framing choice
- the counts (how many rose, how many moved left) are derived and refused if the frozen file stops supporting them

## Devices the worked example implements
- **Axes built from a bar** — the reader is shown what the x position MEANS before a single arc is drawn (`states.mjs`)
- **Arc-by-arc reveal with a live count** — the traversal replaces the sentence "all sixteen improved" (`scene.mjs`)
- **The split legs** — the subject's move is decomposed into its horizontal and vertical components, each carrying its own value (`ConnectedScatterFrame.tsx`)

## Worked example
`proof/video-connected-scatter-lowcarbon/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type connected-scatter --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
