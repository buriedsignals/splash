# Approved — beat 1, measles back past 2019

**Decision: approve.** Given at the Gate 3 production review, on the render at
`renders/measles-return.mp4` and its own final frame, after looking at the still first and then at
five frames pulled out of the encoded file.

What was surfaced for the decision:

- The video: `open stories/r8-chart-video-europe-measles-return/beats/1-measles-back-past-2019/renders/measles-return.mp4`
- Its final frame, rendered before the mp4 and looked at on its own:
  `renders/measles-return-final-frame.png`
- Five frames pulled from the encoded file and looked at, kept in `verification/` (deliberately
  outside `renders/`, which is what the review's digest binds): `frame-000-poster` (the frame a
  feed shows before anyone presses play), `frame-050-reference` (the 2019 rule drawn and named,
  with no data on screen), `frame-110-mid-reveal`, `frame-155-subject` (2024 landed, unlabelled),
  `frame-239-hold` (the last frame).

What was checked, and what it said:

- `staggerLacksAnOrder` on the reveal, from this beat's own `render.mjs`: **14 marks, 14 starts —
  "the marks arrive in their own ascending order."** The build renders only when this passes, and
  the axis it traverses is the one the frame prints (2011 / 2018 / 2024).
- `checkTiming` on `MEASLES_TIMING`: **0 errors.** Events in order, nothing beginning before the
  evidence it depends on has finished, `hold` ending exactly on frame 240.
- `assertDeliveredSize` on the still, read from the PNG's own IHDR: **1080 × 1080.** On the mp4,
  read from `ffprobe`: **1080 × 1080.** Both against the `square` the storyboard pinned.
- `graphicFillsItsFrame` on the final frame: **76.53 %** of the frame carries ink, against this
  format's own measured floor of 35.15 %.
- `revealDashInScreenSpace` on the component: **1 dashed mark** (the reference rule), carrying no
  `strokeDashoffset`, no `pathLength` and no `vectorEffect` — **0 failures.**
- `neverArrives` on the component's **6** interpolation ramps: **0 offenders.** Nothing is still
  arriving on the last frame.
- `csvSplitByHand` on `render.mjs`: **0 failures** — the frozen table is tokenised, not split.

The last three were run **by hand**, from a scratch script, because nothing in this toolchain runs
them on a beat that lives under `stories/`. That is recorded in `NOTES-FOR-MAINTAINER.md`, not
argued around, and it is why they are listed here with their numbers rather than as a passing
build step.

Four corrections were made before this approval, every one of them found by LOOKING and none by
any guard:

1. **The plot was a strip.** The first title wrapped to four lines of 66 px type and the credit to
   four more, leaving the chart roughly 200 px of a 1080 px frame. The title was rewritten to a
   colon clause and the credit's repetition of the region's scope removed; the plot is now 435 px
   and full width.
2. **Two labels shared a baseline.** `.nice()` puts the axis ceiling at 110 000 and the reference
   sits at 104 442 — five pixels apart — so "110,000 cases" and "2019 level · 104,442" read as one
   run-on line. The ceiling's label and gridline were dropped and the unit moved onto the reference
   label. That also recovered a third of the frame's width, which the ceiling label's own measured
   width had been driving `padding.left` from.
3. **The title broke on a one-word last line** ("2024." alone). Four characters were bought back
   with "then" to balance four lines. On a feed post a widow is the first thing the eye catches.
4. **The line was a hairline where it is watched.** 1.33 × 3.0 = 4 frame px is 1.3 CSS px at
   360 dp, and it is the only mark carrying the argument. Raised to 2.0 (2 CSS px).

**One thing was NOT corrected, because correcting it would have meant lying.** The crossing this
beat's headline states — 2024 above 2019 — is 1 795 cases on a 110 000-case axis: **five pixels**.
The reader cannot see it, and the frame does not pretend they can: the number is printed beside
the mark, in words. Truncating the axis would have made it visible and destroyed the collapse to
150, which is the larger and truer half of the same picture. What the motion carries is the
collapse and the return; what the type carries is the last 1.7 per cent. Saying which is which is
the approval, not a caveat on it.
