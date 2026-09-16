# Heatmap — in video

**Argues:** A heatmap lays a grid across two categorical (or temporal) dimensions — day by hour, region by year — and encodes a third, quantitative value as the colour of each cell.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-heatmap-europe-electricity` (2026-09-16), from `proof/static-heatmap-europe-electricity`.

- **A row is a whole — lay it down first**: row after row, the row's total grows as one bar across the grid's width (linear in
  share), its members as segments in column order, two-toned by the claim's split (low-carbon / fossil), over the dashed line
  the claim uses; the count climbs beside the rows as each bar past the line lands.
- **Split the whole into its cells**: row after row every segment slides to its column and folds into its cell, its length
  turning into its class's colour; the line goes as the heads, families, the value column, the bracket and the key come in.
- **Regroup to compare**: the rows outside the claim step back; the claimed rows reorder by the partition (only the rows that
  must move do), part into blocks, the one bracket becoming one named bracket a block, the column that tells them apart ringed.
- **End on the whole matrix** in its rank order, the claimed rows bracketed with their count. Heads stagger over as many lines
  as keep them a word apart (never rotated); a column that is its family alone takes the family's name only. Credit on one
  line beside the key; 20,7 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal in order + count** — each row is first drawn as one LENGTH — a 100 % bar of its own segments across the grid's width — over a threshold rule, with a count climbing
- **`reveal` — transform** — segment by segment each length slides to its column and folds into its cell, taking its class's colour: the viewer watches a length become a colour, which is the type's whole leap of faith
- **`subject` — filter + reorder + compare** — the rows the claim is about stay, the minimum number of rows move, and the column that carries the distinction is ringed across them
- **`conclusion` — pull back** — the moved rows swap back, the rest return in rank order, the claim bracketed; the credit on one line
- **`hold` — ≈60 frames**. About 21 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-colour-scale` — let the colour scale's domain move between shots — a cell's tint must mean the same thing at second 3 and second 20
- `no-reorder-rows-claim` — reorder more rows than the claim needs: every row that moves has to be paid for by the argument

## Precision to assert
- the class breaks are computed once from the frozen file and printed in the key
- every segment's length is its share, and it lands on exactly one cell whose class is that share's
- the partition the claim rests on is asserted disjoint and complete (the blocks sum to the claimed count)

## Devices the worked example implements
- **Length before colour** — a row drawn as a measured bar first, so the matrix's colour is understood as an encoding rather than a mood (`states.mjs`)
- **Stepped classes in one hue with printed breaks** — no reading depends on discriminating a continuous ramp (`HeatmapFrame.tsx`)
- **Minimum reordering** — only the pair of rows the partition needs is swapped, and it is swapped back (`states.mjs`)

## Worked example
`proof/video-heatmap-europe-electricity/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type heatmap --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
