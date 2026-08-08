# combo (line + column, dual axis) — render proofs

All six artifacts come from ONE config, produced through the real chain
(`NativeSpec → specToNativeConfig → produce.mjs <format>`), with every produce-time guard
armed. Nothing here is a hand-built config or a screenshot of a dev server.

| artifact | format | what it proves |
|---|---|---|
| `static.png` | static | The band layout on a real render: the line occupies the top band, the columns the bottom, and **they never cross** — so the frame contains no overtake the data does not. Also the axis titles after the stutter fix ("Units", not "Units (units)"). Passed `snap-contrast` (21 labels ≥ 4.5:1), `snap-label-fit` (25 nodes, 0.00 px overflow), render-size 1200×676 = article-web. |
| `interactive-a11y.png` | interactive | Keyboard focus alone (no mouse) opens the tooltip on a column and it carries **both** series — `Mar · 2,310 Units · 29.6 Margin` — with the swatches painted in the hues the marks actually use. 12 focusable columns; the source renders as a real link. |
| `landscape.mp4` | video | The motion build, article-web aspect. `snap-video`: animates (23.7 mean diff), no blank frames, frame 140 matches the reviewed still (0.56 %), final frame matches the rendered final still (0.63 %). |
| `video-landscape-midreveal.png` | video | **Extracted from `landscape.mp4` itself** (frame 100), not from the review still — mid-build the columns are growing staggered left→right while the line has wiped in only as far as May, and the two bands are already apart. A still of the review render could not prove the mp4 does this. |
| `square.mp4` | video | The `social-feed` channel selects `ComboSquare`; registered dims 1080×1080 asserted against the channel. `snap-video` clean (0.24 % / 0.25 %). |
| `portrait.mp4` | video | The `social-vertical` channel selects `ComboPortrait`, 1080×1920. `snap-video` clean (0.18 % / 0.22 %). The band split is a FRACTION of inner height, so it holds at every aspect — this is the render that shows it. |

## What the renders changed

Two defects were found by producing, not by review, and both are fixed here:

1. **`snap-contrast` failed the first static produce** on `"Margin (%)"` at 2.25:1. Colour-coding
   each axis to its series is the usual dual-axis convention, but measured against a white
   ground exactly ONE Okabe-Ito hue clears 4.5:1 as text (blue 5.19:1; orange 2.25, green 3.42,
   vermillion 3.87). A two-series chart therefore cannot colour-code both axis labels
   accessibly at any size. The axis furniture is now ink/muted and the axis↔series binding is
   carried by NAME — each axis title states its series exactly as the legend does, which
   `checkComboConformance` now requires.
2. **The bands crowded the ticks.** Giving the line axis a third of the frame left ~7 ticks
   about 6 px apart; `snap-contrast` reported a 1:1 ratio because each label was sampling its
   neighbour as its background. Tick counts are now derived from the ticks' own rendered
   positions (`fitTicks`, halving so the survivors stay evenly spaced), with a floor of two —
   the count `checkComboConformance` requires on a zero-suppressed axis.
