# Beat — One shipment, eight checkpoints (scrolly)

**Type:** ASSEMBLY (`scrolly/references/scrolly-discipline.md`'s own two models — every step SSRs
its own complete picture; none is a persistent element lifted out of the frame stack). **Vehicle:**
scrolly. **Channel:** self-contained `renders/eight-checkpoints.html`, eight steps, one frozen CSV.

## What this beat is

One frame kind (`CheckpointFrame.tsx`), stepped eight times: a horizontal 0–140 progress track for
the shipment's own recorded reading, with a filled bar and a marker positioned by the READING
alone — never by the step's own ordinal number.

That is the deliberate design decision this beat exists to test. `source/data.csv` is frozen and
reads:

```
step,label,value
1,Departure,0
2,First stop,12
3,First stop,12
4,First stop,12
5,Midpoint,48
6,Long haul,96
7,Long haul,96
8,Arrival,140
```

The article states why three (and then two) checkpoints in a row carry the same number: "the
scanner at that yard reports once per shift, not once per container." An honest picture of "where
the shipment reads, right now" therefore has to draw the identical picture for checkpoints 2, 3, 4,
and again for 6, 7 — not manufacture a difference (e.g. a marker positioned by step INDEX rather
than by reading) that would hide the fact the article is making a point of. `CheckpointFrame.tsx`'s
own header states this explicitly.

## What the guards said — see the story's own report for the full verbatim run

- **`step-redraws` (`stillSteps`/`STEP_REDRAW_FLOOR` in `verify-scrolly.mjs`) fired on all three
  genuinely-repeated pairs — checkpoint-2/checkpoint-3, checkpoint-3/checkpoint-4,
  checkpoint-6/checkpoint-7 — at all three widths driven (1600×900, 1280×800, 375×812). 9 failures,
  every one of them correct: the picture really is unchanged between those pairs.
- **`scrub-not-slideshow` (`requiresScrub`/`stalledSteps`) never engaged.** This beat is architected
  as an ASSEMBLY (every one of the 8 `.step-frame`s carries its own SSR'd content —
  `framesWithContent === frames`), and `requiresScrub` only requires the intra-step motion check
  when some frame is left content-less for a lifted, persistent visual to drive. It is not a defect
  in this beat that the check stayed silent; it is the check correctly recognising a shape it was
  not built to police.

## A second, unrelated defect the driving found and this beat fixed

The first render put a single short clause on checkpoint 5 ("Midpoint", no repeat note). Driven at
375px, `verify-scrolly.mjs`'s own F4 assertion ("one of two widths, never the in-between shape")
failed: that one card measured 347px against a 375px graphic (93%) — neither comfortably narrow nor
edge to edge, which is exactly the shape that can slice a label down the middle. Cause:
`.step-panel` has no explicit width below 600px, only `max-width: 100%`, and sizes to its own
content inside a `justify-content: center` flex row — a short enough clause shrinks the card below
full width. Fixed by adding one more data-derived clause (the checkpoint's own progress fraction,
computed, not typed) to every middle step's prose, which is long enough at every width to reach the
frame's own edge. Re-driven: 0 F4 failures.

## Colours

`PALETTE.md` beside the story, read through `readPalette` — Buried Signals's own house colours
(`origin: newsroom`), the same recorded answer `stress-f-housing-pressure` uses. Panel contrast
measured 17.66:1.

## JavaScript disabled / reduced motion

Both checks in `verify-scrolly.mjs` passed silently (no failure reported for either at any width).
