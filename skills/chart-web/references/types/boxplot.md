# Box plot — in web

Worked example: `proof/web-boxplot-france-co2-decades` (2026-09-15).

- **The gesture**: the reader parks one decade's OWN THREE LEVELS — Q1, median, Q3 — flat across all
  eight boxes, and reads every other box against that band instead of against the axis.
- **Start from what falling medians bury.** Eight medians fall monotonically just as happily when the
  boxes underneath sit on top of each other, and nobody sees that in a row of rectangles at eight
  different x. The yardstick returns the fact: the 1980s box and the 1960s box are the same box.
- **Build it with `chart-web/assets/level.ts`** — no fourth vocabulary — and lay ALL THREE LEVELS or
  none. A box plot's argument is the SPREAD; a yardstick carrying only the median measures this
  picture on the one channel a plain line chart already has, and `assertLevelDeclaration` refuses it.
- **Draw the sample beside its own summary**: a box hides the readings it was computed from, so every
  year is its own dot beside its box and every dot answers with its year, its value and where it sits
  inside its decade. The still could draw the dots; it could not name any of them.
- **Whiskers are Tukey's and the fence is computed, never drawn to the extreme** — a whisker that
  always reaches min and max is a range plot in a box plot's clothes. Each box prints its own median
  and its own n, so a partial decade cannot be read as a full one.
