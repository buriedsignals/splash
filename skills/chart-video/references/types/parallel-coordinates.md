# Parallel coordinates — in video

**Argues:** Parallel coordinates lay several variables out as parallel vertical axes, each keeping its OWN independent scale, with one item drawn as a single polyline crossing every axis in turn — so the crossing pattern of many items' lines reveals trade-offs a table of the same numbers hides.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows.

## Recorded from the validated beat

Worked example: `proof/video-parallel-coordinates-electricity-mix`, from `proof/static-parallel-coordinates-electricity-mix`.

- **Show what a line is before drawing sixteen**: one entity's whole grows along the foot as a bar, splits into its parts,
  and each part stands up on its own rail keeping its length; the line joins the tops. That needs **one scale on every
  rail** — a height is the same share everywhere, and the slope between neighbours is a real difference.
- **Name each line once, at its highest vertex**, seats measured against the other names, the floors and every other rail;
  a short form only where the full name crosses a neighbour on every rail.
- **Magnify the pair of adjacent rails the claim is about** by opening their gap (x only, heights kept); then **sweep a
  floor up each rail** at the axis's own pace, each line stepping back as the floor passes it, the count the lines at or
  above both floors at every frame.
- **End on the whole chart**: rails home, every line back, the survivors in the accent, the floors ticked on their rails;
  the credit on one line. About 21 s.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — whole → split → stand + trace** — one item's whole is grown as a single bar along the foot, cut into its parts, and each part STANDS UP onto its own rail keeping its length; the item's line is then the tops, so the polyline is explained before it is used
- **`reveal` — trace** — the other items' lines are drawn across the rails one after another, each named at its seat
- **`subject` — magnify + sweep + count** — the gap between the two rails the claim is about opens across the frame, heights kept, and a floor rises on each in turn, stepping back every line it passes while a count falls
- **`conclusion` — pull back** — the rails close, every line returns, the pair in the accent and the two floors marked; the credit on one line
- **`hold` — ≈60 frames**. About 22 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- fit each rail to its own column here: this beat puts every rail on ONE scale so a slope is a difference in points, not an artefact of two ceilings — and if a beat does keep per-rail scales, it may not let a slope carry meaning
- reorder the rails mid-beat: the adjacency is the argument, so a rail order is chosen once and stated

## Precision to assert
- every rail carries the same stated scale in this beat, and a standing piece's top equals its line's vertex at every frame
- the count is recomputed as "lines at or above every floor raised so far", at every frame, not stepped by hand
- vertex heights are identical between the overview and the magnified pair — the magnification opens the gap, it does not rescale the values

## Devices the worked example implements
- **Stand-up construction** — the polyline is derived from a bar the reader already understands, which is what makes the type readable at all (`states.mjs`)
- **The opened pair** — two adjacent rails widened across the frame, heights untouched, so a crossing can be watched (`scene.mjs`)
- **Rising floors with a live count** — a two-condition filter shown as two sweeps rather than stated as a result (`ParallelFrame.tsx`)

## Worked example
`proof/video-parallel-coordinates-electricity-mix/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `subject.mjs` (the frozen read and its shape asserts), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`WINDOWS` and `fieldAt` — what moves over which share of an event), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/chart-video/scripts/scaffold-video-beat.mjs --type parallel-coordinates --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
