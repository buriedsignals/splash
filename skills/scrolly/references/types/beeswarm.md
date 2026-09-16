# Beeswarm — scrolly

**Argues:** A beeswarm shows every raw observation on one shared value axis, with no aggregation and no overlap — the "show your data" distribution chart.

Owner rules that apply here: this is not a static replay; the scroll's transitions interpolate continuously; this type finds its own approach from its subject rather than reusing another type's choreography.

## Scroll gestures
- **Reveal in order** — points settle onto the shared value axis
- **Filter** — the subset the claim is about keeps its ink, the rest steps back to neutral
- **Zoom / focus** — a crowded cluster grows to print the values packing hides
- **Pull back** — the whole swarm returns with the named subset still marked

## A choreography must NOT
- replay the static plate's states as a slideshow — every card must change the picture by a continuous transformation, not a hard cut
- pop marks in groups on a fixed picture instead of interpolating them from the scroll's own continuous progress
- overlap two pictures on one card
- let two cards' notes share a slot where both are visible together

## Precision to assert
- point packing (no overlap) is recomputed at every card's frame, not just the last one
- a filtered-out point keeps its position — it steps back in colour, never in place

## Devices the worked example implements
- **Two packings, one field** — every circle is packed TWICE on each resize: once at one radius (position is the only channel) and once at its real population (the static plate's own size ladder). `grow` interpolates each circle continuously between its own two seats, so the same marks swell and push each other apart — never a cut between two separately-computed layouts (`swarm-layout.mjs`'s `layoutSwarm`/`packSwarm`).

## Worked example
`proof/scrolly-beeswarm-co2-per-person/` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions-scrolly.mjs` (data, assertions, words), `DirectedBeeswarmScrolly.tsx` (the marks) and `swarm-drive.mjs` (the paint). `BRIEF.md` records the choreography table and precision section, not the shape. `skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type beeswarm --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.

**Start from the validated video when one exists.** `/Users/rmdms/Sites/Professional/splash/video/skills/chart-video/references/types/beeswarm.md` (read-only, other worktree) and its `proof/video-beeswarm-*` — the same subject's build order is often the scrolly's own card order, adapted to be scroll-driven rather than timed.
