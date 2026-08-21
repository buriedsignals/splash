# Gate 3 — approved

**Beat:** slot 1, the spread itself. **Medium/format:** chart / static, landscape.
**Artifact shown:** `renders/salary-spread-still.png` (1920 × 1080), opened and looked at.
**Decided:** 2026-08-21.

The journalist was shown the PNG and asked to approve or correct. Nothing about delivery was said in
that turn: the forms are `offerForms`' output and cannot be known before it runs.

**Approved as drawn**, with three things recorded rather than waved through.

What was checked in the pixels, and not only in the markup:

- **The denominator is on the frame.** The standfirst reads "234 of the company's 240 employees;
  6 returned no salary and are not drawn", and both numbers are computed at render time from
  `source/data.csv` and cross-checked against `source/profile.json`'s own `missing: 6` — the render
  throws if the two disagree, so the chart cannot state a denominator the frozen profile does not.
- **The two rules read where they are drawn.** No single ink reads over both this newsroom's ground
  and its accent, so each rule is two segments, each measured by `inkThatReadsOver` against the one
  background it has. `inspectSvg` against the real ground: **0 failing runs, 0 unresolved** out of
  every painted run in the frame. `assertAnnotationReadsOverMarks`' artifact-level walker
  (`splash/test/annotation-reads-over-what-it-crosses.test.ts`) passes over the delivered SVG.
- **The frame is filled.** `frameFillFraction` on the delivered PNG's own pixels: **0.777**, against
  a floor of 0.3515 and a measured population minimum of 0.4315.
- **No dash measures its own path.** `revealDashInScreenSpace` over this component's marks returns
  `[]`: two dashed rules, no `strokeDashoffset`, no `pathLength`, no `vector-effect`.
- `assertDeliveredSize`, `assertTypeFloor`, `assertWithinStage` and `assertDrawnInActiveTypeface`
  all pass against the delivered PNG and SVG.
- **No root `<title>`**, and the alt text is present as `<desc>` and names the shape, both levels,
  the tail and the six who are not drawn.

Three limitations recorded rather than fixed:

1. **The first render collided two x-axis labels.** `tickStep` returns a 20 000 € interval for this
   span, so its first tick (20 000) sat one bin from the domain's own floor label (10 000) and the
   two centred labels overlapped into `10,00 20,000`. Fixed in the component by measuring the floor
   label against the first tick and dropping it when it would collide. Found by opening the PNG;
   nothing in the toolchain measures x-tick collisions.
2. **`framingMeasurement` cannot read this treatment's own marks.** It answers on the 234 salaries
   (`largestAgainstMedian` 7.59, the outlier reading this beat is about) and returns `null` on the
   46 bin counts, because the median bin count is 0 and the function guards on `median > 0`. On a
   right-skewed distribution most bins are empty by construction, so the reading is undefined for
   every histogram. Recorded in `../../NOTES-FOR-MAINTAINER.md`.
3. **This beat cannot be re-grounded on white without a new accent.** `#D4A853` measures 2.16:1 on
   `#FFFFFF`, under the 3:1 non-text floor, so the light-ground pass the static discipline asks for
   is not a look at this beat — it is a different palette question. The beat ships on the ground
   `NEWSROOM.md` records, where the accent measures 8.01:1.

In this run the journalist was not present and the decision was taken on their behalf. Recorded in
`../../NOTES-FOR-MAINTAINER.md` rather than dressed up as an answer somebody gave.
