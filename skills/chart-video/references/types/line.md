# Line — in video

**Argues:** A continuous series read against an ordered axis, almost always time, encoded as position and joined into a single stroke that reads as one trend.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-line-swiss-co2` (validated 2026-09-15), from the static `proof/co2-suisse`.

- **The trace** comes first: the line draws itself through time, linear in years (equal frames, equal years — easing
  would lie about the pace of the data), the year and its reading riding at the tip, the text for every year measured in
  Bun. No reference rule is drawn before it: the argument finds the level, it does not announce it.
- **A turning point is marked once passed** (« pic de 1973 »), never before its data.
- **The argument is a rewind**: the last reading is ringed, then a dashed level line shoots back from it at that value,
  the year counting down at its head, and lands where the rising line first reached the same reading — interpolated
  between the two years that bracket it, and asserted to lie before the peak. The landing year is ringed; its label
  moves off the ring.
- **The last shot is the whole line**, both readings ringed and joined by the dashed level.
- The plot leaves room at the right for the widest tip label and at the left for the value ticks; the credit sits on
  one line in its own row under the decades.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — three value ticks and the decades: the scale before the shape
- **`reveal` — trace** — the line draws through time, LINEAR in the axis, its tip carrying the current date and value, and the landmark named once as it is passed
- **`subject` — name + rewind** — the last point is ringed and a level line shoots BACK from it with the years counting down at its head, landing where the rising series first reached today's reading: the comparison year is found, not announced
- **`conclusion`** — the credit on one line, the level line and both rings kept
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-anchor-value-axis` — anchor the value axis at zero because a bar chart would: a line encodes change by slope, and zeroing it flattens the series
- `no-name-comparison-level` — name the comparison level before the rewind finds it — stating the answer first turns the shot into an illustration

## Precision to assert
- a gap in the series breaks the line rather than being bridged across missing readings
- the peak, the last reading and the year the rewind lands on are all derived from the frozen file and asserted
- the traversal is linear in the axis, so equal spans of time occupy equal screen time

## Devices the worked example implements
- **The rewind** — a level carried backwards until it meets the curve, which turns "back to 1967" into a measurement (`states.mjs`)
- **A travelling tip label** — the current date and value ride the head of the trace, so no axis crowding is needed (`LineFrame.tsx`)
- **Shared crossing geometry** — the landing is computed by the static sibling's own module, not re-derived (`subject.mjs`)

## Worked example
`proof/video-line-swiss-co2/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type line --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
