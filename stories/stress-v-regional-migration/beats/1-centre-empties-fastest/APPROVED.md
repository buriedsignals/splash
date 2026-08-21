Seen at real size, at BOTH frames the journalist asked for: the pinned portrait (1080 x 1920,
`renders/centre-empties-fastest-portrait-final-frame.png`) and the square second form (1080 x 1080).
Six frames were extracted from the portrait mp4 and opened — 20, 50, 130, 200, 250, 329 — one inside
`establish`, one inside `reference`, one mid-`reveal`, one inside `subject`, one inside `hold`, and
the last frame.

Approved.

- **Portrait survives, and it is portrait, not landscape rendered narrow.** The whole block — two
  title lines, two caveat lines, the axis title, seven rows, two conclusion lines and the credit —
  lands between baselines 323 and 1242, inside Meta's published 269–1248 safe band. Nothing is
  clipped, nothing runs into the reserve at either end, and the credit is inside the band rather
  than pinned to the frame's bottom margin where the platform's progress bar sits. On a bare page
  the frame reads top-weighted, with the bottom 35% empty: that is the `v3` composition
  `proof/portrait-aspect-probe/CENTRING-VERDICT.md` recommends and the emptiness is the chrome's,
  not the chart's.
- **Values crossing zero read correctly.** Three bars right, four left, one zero line drawn before
  any of them and drawn on top of all of them. Every bar is on the same scale: Montagne's -780 is a
  thirteen-pixel sliver and states its own number outside itself, which is the whole finding and the
  reference's own lesson. Nothing is rescaled, no axis is broken, no small-value panel is invented.
- **The accent does not appear before its evidence.** At frame 130 all seven rows are still white;
  Centre takes the accent at frame 200, after the last bar has landed. The conclusion arrives after
  that. Checked frame by frame, not assumed from the contract.
- **The counting labels count the drawn length, not the final value.** Frame 130 shows Littoral at
  "+3 784" and Montagne at "-178" — the bar's current length, so no frame ever states a number the
  picture does not yet show.
- **Contrast measured, not eyeballed**, against each run's own real local background, including the
  one case a per-run check would otherwise miss: Centre's number is drawn in the accent ON the
  accent wash, which measures 5.97:1 (floor 3:1 for a 38px run). Body runs measure 17.66:1 (ink) and
  7.39:1 (muted) against the ground.
- **The two facts the beat asserts are computed from the frozen CSV and would stop the render if
  they changed** — four losing regions and three gaining, and Centre as the largest loss.

Recorded limitations, named rather than waved through:

- **No tick axis.** Removed deliberately at portrait: a "-20 000" label is ~150px wide at the 36px
  floor and four of them collide across a 614px plot band. Every bar carries its own number instead,
  which is complete information, but a reader cannot interpolate a value the chart does not label.
- **The per-resident reading is stated in words, not drawn.** The caveat says Sud, not Ouest, gained
  most per 1000 residents; it does not show it. That is the honest limit of a single raw-count chart
  and it is why the hand-over carries the second reading too.
- **`framingMeasurement` could not answer the question this beat is about.** Its outlier reading is
  `null` for a series whose median is negative, so the 3.6% ratio that decided the treatment was
  computed by hand in `render.mjs`. Recorded in `BRIEF.md` with the numbers.

No human journalist was available; this review was completed as their stand-in, per the stress
test's own rule.
