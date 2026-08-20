---
size: landscape
type: line
---

# Beat — Building permits rose every year from 2020 to 2025

**Type:** line (a trend over time). **Medium/format:** chart / static.
**Channel:** article web — **size: landscape (1920 x 1080)**.

## The trap this beat was built to name

The frozen article's headline is "Building permits collapse in 2026" and its body calls 2026
"the sharpest drop in the series." Both claims read `permits_issued` for 2026 (14,205) as though
it were a full-year figure comparable to 2020-2025. It is not: the CSV's own `months_covered`
column records 2026 at **3**, against **12** for every year before it — a fact the article states
in its own last line ("The registry note says the 2026 figure covers January to March") without
ever connecting it to the headline built two lines above it.

Nothing in `source/profile.json` links `months_covered` to `permits_issued` — no per-month rate,
no annualised column, no computed ratio. That link has to be made by whoever draws this chart, not
assumed away.

## The decision, taken explicitly

**The partial period is disclosed, not dropped and not annualised, and it is kept OFF the plotted
comparison.** Three options were open and two were rejected:

- **Drop 2026 entirely.** Rejected: the article's own last line makes a point of the partial
  reading existing, and a chart that erases it answers a question the frozen source explicitly
  raises.
- **Annualise it (14,205 x 4 = 56,820) and plot it as a seventh year.** Rejected: multiplying a
  Q1 reading by 4 assumes permits are issued at a flat rate across the year, which is not a fact
  this frozen source states or supports — a registry's own filing patterns (fiscal-year-end
  pushes, seasonal building-season effects) routinely violate it, and this beat has no basis to
  assert one specific assumption over another. Doing the multiplication and drawing the result as
  though it were a measured value would launder an assumption into a fact.
- **What this beat does instead:** the six complete years (2020-2025) are drawn as the one
  continuous line, on a y-axis fitted to THEIR range only (`static-discipline.md`'s own
  fitted-scale rule, applied to the range that is actually comparable). 2026 is named at its own
  x position, in the same frame, as a **text annotation with no plotted mark and no line segment
  reaching it** — the same visual grammar the seed already uses for a hole in the series
  (`ChartSeed.tsx`'s `gaps`), extended to a different reason a reading cannot be compared: not
  "missing," but "not a full year." The number is on the frame, named plainly, and it is not
  wired into the same vertical scale as six 12-month totals, which is the wiring that manufactured
  the "collapse."

This is `static-discipline.md`'s `framing-serves-the-point` discipline, read one level up: that
section asks whether a series' own values read honestly against the extent they are drawn on
before a treatment is picked. Here the prior question is whether a value belongs on that extent
at all, and the answer this beat gives is no — a 3-month reading has no honest y-coordinate on an
axis built from six 12-month totals, so it does not get one.

## Claim

Permits rose every year from 2020 (48,210) to 2025 (58,990) — a rise of 22.4% over six years, none
of it about 2026. The only 2026 figure available (14,205) covers January-March, 3 of the year's 12
months, and this beat states that fact directly on the frame rather than let a reader compare it to
the years beside it.

## Subject and accent

The subject is the six-year rise itself, drawn in the newsroom's accent per `PALETTE.md`. The
2026 note is muted ink, deliberately not the accent: it is not part of the trend the accent is
carrying, and colouring it the same as the six-year line would visually re-attach it to the
comparison this beat is refusing to draw.

## `framing-serves-the-point`, read and printed

`render.mjs` calls `framingMeasurement` on the six complete years before drawing and prints both
numbers to the console — see its own output. The reading is unrelated to the partial-period trap
(it answers "does this spread read against its own extent," not "is every value comparable") and
is reported as exactly that: a different question, answered honestly, that does not by itself
catch or excuse the headline's error.

## Source

City permits registry, frozen `source/data.csv`. `months_covered` column recorded by the registry
alongside `permits_issued`; effective date is the registry's own 2026 filing as of the CSV freeze.
