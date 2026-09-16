# Beeswarm — in video

**Argues:** A beeswarm shows every raw observation on one shared value axis, with no aggregation and no overlap — the "show your data" distribution chart.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-beeswarm-co2-per-person` (2026-09-15), from `proof/static-beeswarm-co2-per-person`.

- **Start from the whole, on the swarm's own area scale**: one disc whose area is every unit's (humanity), seated at the
  weighted mean on the value axis, named once. Pack the swarm in Bun (largest first, pushed only across the axis) so every
  seat is known before a frame is drawn.
- **Burst the whole into its members**: largest first, each unit leaves the disc and flies to its seat (an arrival, eased),
  the disc shrinking to the population not yet gone — the area is conserved through the whole move; count as they land.
- **Measure a share by merging**: ring the subset and bracket it from below; the whole's outline comes back where it stood
  and glides to empty space; copies of the subset fly into it and merge, the merged area their sum, the share written under.
- **End on the whole swarm**: the copies fly back and vanish on their seats, the outline goes, the share travels under the
  bracket's count; the credit on one line. About 20 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — the value axis, the weighted-average rule and its value, and the population as ONE disc standing at that average
- **`reveal` — split + count** — largest first, each observation leaves the disc and flies to its own value, keeping its area; the disc shrinks to exactly what has not left; a count climbs as they land
- **`subject` — name + compare** — the cases the claim is about are ringed and bracketed, and a copy of each flies into an outline of the original disc and MERGES, so the share is seen as an area rather than read as a number
- **`conclusion` — pull back** — the copies fly home and vanish on their seats; nothing is left stepped back; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-recolour-cases` — recolour the cases: the field keeps one colour and the cases are RINGED, so the distribution is never split into two populations by hue
- `no-let-point-move` — let a point move to avoid an overlap without the packing being recomputed — a silent nudge is a value moved

## Precision to assert
- the disc's area is always the sum of the areas that have not yet left it, asserted frame by frame
- the merged disc's area equals the summed population of the ringed cases, and the printed share is that ratio
- the average's position is the population-weighted mean, computed in the runner

## Devices the worked example implements
- **The burst from one disc** — humanity as a single area that conserves itself as it splits, which is what makes the final speck legible (`states.mjs`)
- **Merge-into-outline** — the share is shown as two areas in the same place rather than as a percentage (`BeeswarmFrame.tsx`)
- **Packing recomputed per frame** — no overlap at any point of the flight, not only at rest (`scene.mjs`)

## Worked example
`proof/video-beeswarm-co2-per-person/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type beeswarm --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
