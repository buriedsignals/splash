# Histogram — in video

**Argues:** A histogram bins one continuous variable into contiguous intervals and draws a bar per bin whose height is the count that landed there.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-histogram-carbon-footprint-spread`, from `proof/static-carbon-footprint-spread`.

- **A bin is a pile of observations, so start from the observations**: a tick per country along the variable's axis, swept
  at the data's pace, each inside its own bin (an open last bin holds its tail inside its bar).
- **Pile them on the count scale**: every tick widens into one cell of its bin, then rises; the j-th cell of every bin lands
  at the same moment, so the bins rise at one pace and stop at their counts. A bin's landed cells are drawn as one bar.
- **Show a share by moving the other side**: the declared cut rules the gap between two bins, its count on the side the claim
  names; the bins past it rise in their slot and slide, keeping their lengths, onto the first of them — over nothing taller —
  the column's count its landed height, rising ahead of each incoming bin. Seams of the ground cut both columns into tenths
  of the whole: the share counted in pieces.
- **End on the whole histogram**: the seams close, the moved bins back in their slots top first; the cut and its count kept,
  the credit on one line.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — trace** — the observations are laid along the VALUE axis first, one tick each, swept at the data's own pace: the population exists before it is binned
- **`reveal` — fall + count** — every tick widens into one cell and stacks into its bin, all bins rising at the same pace, so a bar's height is visibly a count of individuals
- **`subject` — cut + stack + tenths** — the threshold rises in the accent with its count, the bins beyond it slide (lengths kept) onto one column, and seams cut both columns into tenths of the total: the headline ratio read off the picture
- **`conclusion` — pull back** — the seams close, the bins slide back into their slots; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-change-bin-edge` — change a bin edge mid-beat — bin width can manufacture or erase a peak, so the edges are fixed once and every shot uses them
- `no-draw-bars-before` — draw the bars before their observations: the point of the format here is that a bin is a pile of countable things

## Precision to assert
- every observation falls in exactly one bin, and the cells sum to the asserted total
- one count scale from zero for the cells, the bins and the stacked column
- the threshold count and its complement are derived, and the printed share is their ratio

## Devices the worked example implements
- **One cell per observation** — the bar is built out of countable units rather than drawn as a height (`states.mjs`)
- **The tail stacked into one column** — the complement is made comparable by moving lengths, not by printing a number (`HistogramFrame.tsx`)
- **Tenth seams** — the headline "6 in 10" is cut into the picture and can be counted (`HistogramFrame.tsx`)

## Worked example
`proof/video-histogram-carbon-footprint-spread/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type histogram --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
