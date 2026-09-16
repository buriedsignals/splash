# Sankey — in video

**Argues:** A sankey diagram answers "how does a quantity flow and split as it moves through a sequence of stages" — with each stage laid out as its own column of nodes and ribbons flowing between them whose THICKNESS is proportional to the amount flowing.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-sankey-electricity-sources` (2026-09-16), from `proof/static-sankey-electricity-sources`.

- **Start from the whole as one bar**: it grows down the source rail, its height the running total on the one px-per-unit
  scale both rails keep, the total counting beside it.
- **Split it, then pour it**: gaps open and cut the bar into the sources, every height kept; source after source, the
  ribbons run along their own curve (the cubic cut at t, both edges at the same x), each target node filling by the
  ribbons landed in it — conservation drawn as it happens, a node's words arriving when it is full.
- **Filter and trace the flow the claim names**: every other source's ribbons step back; the tracked ribbon fills with the
  accent left to right, its two nodes turning with it.
- **Compare by carrying the source to the target**: a copy of the whole source bar slides beside the target node, its
  height kept, its tracked part level with the ribbon's landing band, the rest overhanging; the share in the ribbon.
- **End on the whole sankey**: the copy slides home, every ribbon returns, the share travels inside the ribbon to its
  source end; the credit on one line. 20,5 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — grow + count** — the whole quantity is one bar growing down the first rail, its height the running total
- **`reveal` — split → pour** — gaps cut the bar into its source nodes, heights kept, and the ribbons pour to the far rail source after source, each destination node filling as its ribbons land and taking its name and total only once it is full
- **`subject` — filter → trace → slide + compare** — every ribbon but the one the claim names steps back, that ribbon fills with the accent, and a COPY of its source node travels to the destination and lands beside it so the aligned part and the overhang are one measurement
- **`conclusion` — slide back + pull back + name** — the copy returns into its node, the other ribbons come back, the share stays written on the accented ribbon; the credit on one line
- **`hold` — ≈60 frames**. About 22 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-node-height` — let a node's height stop being the sum of its own ribbons in any shot — conservation on both rails is the type's whole promise
- `no-change-scale-travelling` — change the scale for the travelling copy: it keeps its height the whole way, or the alignment proves nothing

## Precision to assert
- every node's total equals the sum of its ribbons, on both rails, asserted
- one pixels-per-unit scale for nodes, ribbons and the travelling copy, at every frame
- the printed share is the ratio of the aligned band to the copy's own height, computed in the runner

## Devices the worked example implements
- **The travelling node copy** — a share of a flow measured against the flow itself instead of stated (`states.mjs`)
- **Fill-then-label** — a destination is named only when its ribbons have all landed, so no total is shown before it exists (`SankeyFrame.tsx`)
- **Split-then-pour** — the left rail is derived from one whole, so the diagram never starts as an abstraction (`states.mjs`)

## Worked example
`proof/video-sankey-electricity-sources/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type sankey --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
