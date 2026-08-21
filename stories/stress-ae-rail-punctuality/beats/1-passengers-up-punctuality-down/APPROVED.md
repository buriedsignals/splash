# Approved — beat 1, passengers up, punctuality down

**Decision: approve.** Given at the Gate 3 production review, on the render at
`renders/rail-punctuality.mp4` and its own final frame, after looking at the still first and then
at five frames pulled out of the encoded file.

What was surfaced for the decision:

- The video: `open stories/stress-ae-rail-punctuality/beats/1-passengers-up-punctuality-down/renders/rail-punctuality.mp4`
- Its final frame, rendered before the mp4 and looked at on its own:
  `renders/rail-punctuality-final-frame.png`
- Five frames pulled from the encoded file and looked at: `frame-0` (the poster frame),
  `frame-50` (inside `reference`), `frame-120` (mid-reveal), `frame-208` (the subject landing),
  `frame-299` (the last frame of the hold).

What was checked, and what it said:

- `staggerLacksAnOrder` on the reveal, from this beat's own `render.mjs`: **12 marks, 12 starts,
  12 positions — "the marks arrive in their own ascending order."** The build renders only when
  this passes.
- `revealDashInScreenSpace` on the component: 2 dashed marks found, neither carrying a
  `strokeDashoffset`, a `pathLength` or a `vectorEffect` — **0 failures.**
- `neverArrives` on the component's 5 interpolation ramps: **0 offenders.** Nothing is still
  arriving on the last frame.
- `graphicFillsItsFrame` on the final frame: **76.26%** of the frame carries ink, against this
  format's own measured floor of 35.15%.
- `csvSplitByHand` on `render.mjs`: **0 failures** — the frozen table is tokenised, not split.
- `checkTiming` on `RAIL_TIMING`: **0 errors.** Events in order, nothing beginning before the
  evidence it depends on has finished, `hold` ending exactly on frame 300.
- `framingMeasurement`, per panel: passengers spread 62.3% of its own extent, largest 1.18x the
  median; punctuality 13.7% and 1.08x. Each panel is fitted to its own readings.

Three corrections were made before this approval, all found by LOOKING and none by any guard:

1. The reference labels — `58.2m` and `91.4%` — were centred on their own rules, which put `91.4%`
   directly over the segment climbing into 2020. They now sit at the end of the rule, on the side
   the series does not end on, and the side is read off the data.
2. The two 2020 value labels were centred on the mark, so the dashed tie joining the two panels ran
   through the digits. They are set beside the tie now.
3. The panel names sat too close to their own top gridline at the landscape type scale.

Approved as-is. No further correction requested.
