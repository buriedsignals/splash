Opened at 1920×1080 on the newsroom's own ground and looked at, three times — after the first
render, after the annotation was moved, and after the end labels were brought back onto their own
line ends. Also redrawn on `#FFFFFF` in `probe/` and looked at there, which is what produced the
last note below.

Approved. The accented line climbs from 39 at the left edge to a labelled 214 at the right; the
muted line comes down from 357 to a labelled 248; the two end labels sit at their own line ends
with no leader, 34 deaths apart, which is the finding. The 2015 reading the title names is marked
with a dot and its value, 13px clear of the stroke that climbs past it. The y axis names its unit
once, on the top gridline. The x axis runs 2014 to 2025 and the note says on the face of the chart
why it starts there. The source and the table's own status date are on the frame's bottom margin.

Three limitations recorded rather than waved through:

1. **A count is not a risk.** Nothing in the German road-accident statistic records how far anyone
   rode, so this chart cannot say a pedelec is more dangerous than a bicycle — only that more
   people are being killed on one. Destatis says the same thing in its own methodological note.
   It is on the face of the chart ("Deaths, not risk"), in `STORYBOARD.md`'s `limits`, and it
   travels with the hand-over. Nothing in this toolchain raised it.

2. **The takeaway's 16.4% is not this table's 16.3%.** The confirmed takeaway quotes Destatis's
   own April 2026 press release, which says in its own words that the figures are preliminary. The
   July time series this chart is drawn from gives 462 cyclists of 2 832 road deaths — 16.3%. The
   grounding check reported `unverifiable` rather than `contradicted`, correctly, because it cannot
   compute a ratio between two columns and because the columns involved are typed `text`. The
   chart prints neither percentage. The discrepancy is recorded in `limits` and in the run's
   maintainer notes.

3. **The house accent does not clear the floor on paper.** `#D4A853` measures 8.01:1 on this
   newsroom's `#16191B` and **2.20:1** on `#FFFFFF`, under the 3:1 non-text floor. This beat records
   `destination: screen` and ships on the dark ground, so it is not affected — but the light-ground
   probe is committed beside it, because the same component handed a paper ground would draw a line
   a reader cannot see and nothing at the render would say so.
