# Streamgraph — in video

**Argues:** A streamgraph shows many overlapping time series stacked with no fixed baseline — bands can wiggle up and down around a shifting centre rather than growing from a flat zero line — so the READ is the overall rhythm and relative flow of many series at once, not the exact value of any one band at any one point.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-streamgraph-swiss-electricity` (validated 2026-09-15), from
`proof/static-streamgraph-swiss-electricity`.

- **The flow** comes first: the stream is revealed by a front travelling linearly in years (the still's own stack —
  silhouette offset, inside-out order), the large bands named inside themselves once the front has passed them.
- **The argument makes the hidden race visible**. Every band's edges are measured in Bun in four arrangements, and each
  point is carried between them:
  1. the stream;
  2. the giants at nothing, the small sources closed in on the same scale, in the same order;
  3. that stack magnified about its centre line until its widest year fills the frame;
  4. every small source as a line from zero, on a scale its largest reading fills.
- **A cursor races the years** on the lines, the tracked layer's rank riding its line and the year of the claim ruled once
  passed; only the layer it overtakes is named. The stream is drawn on a curve through the readings (monotone), so the
  lines cross where the data cross.
- **The last shot is the whole stream**: lines back to bands, the magnification dropped, the giants returned — their names
  only once their bands are nearly whole — and the year still ruled, the rank at the stream's end.
- The subject asserts what the gesture relies on: the giants hold the first ranks every year (or setting them aside would
  hide the race), and the tracked layer overtakes the named rival in the claimed year. The credit sits on one line under
  the years.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — the time ticks only: a free baseline has no value axis to offer
- **`reveal` — trace** — the stream flows through time, LINEAR in the axis, the largest bands named inside themselves once passed
- **`subject` — filter, magnify, transform, count** — the giant bands fade and close to nothing while the small ones close in on the stream's own scale, the remainder is magnified, the bands become LINES FROM ZERO (where rank is height), and a cursor races the years with the subject's rank riding it
- **`conclusion` — pull back** — lines back to bands, magnification dropped, the giants returned, the found year still ruled; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- print a value against a band: the baseline is free, so a height read off a wiggling band is not a reading
- recentre the wiggle baseline between shots — it is computed once and held, or the bands move for reasons the data did not

## Precision to assert
- the wiggle baseline is computed once and held fixed across every shot
- every period in the range is present and complete; a partial period is excluded and said to be
- the rank the beat claims is computed year by year from the frozen file, and the year it changes is asserted, not read off the picture

## Devices the worked example implements
- **Giants set aside** — the dominant bands are closed so the contest the claim is about is at a readable thickness (`states.mjs`)
- **Bands turned into lines from zero** — the transform that makes rank a height, then undone (`StreamFrame.tsx`)
- **A rank riding the cursor** — the claim's quantity is shown as a label that changes with the data, not a caption (`scene.mjs`)

## Worked example
`proof/video-streamgraph-swiss-electricity/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type streamgraph --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
