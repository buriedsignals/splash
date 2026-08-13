---
size: landscape
type: histogram
---

# Beat — six in ten countries emit under 4 tonnes of CO2 per person

**Type:** histogram. **Medium/format:** chart / static. **Size:** landscape (1920 x 1080).

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize`. The prose line used to be the only record
of gate 2c's decision, checked by nothing, while the component carried its own `const FRAME` and the
render script repeated the same two literals.

## Claim

127 of 213 countries (60%) emitted under 4 tonnes of CO2 per person in 2023; the distribution is
heavily right-skewed, with a handful of oil and gas producers as far out as 24-40 tonnes. Median:
3.1 t/capita.

## Subject and accent

Bars fill in the page's own muted tone (not a saturated colour) — no single bar is "the subject."
The one accent marks the median reference line, per `references/types/histogram.md`'s own worked
example: "one accent colour, not the bars' own fill repeated as a second signal."

## Source

Global Carbon Budget (2025), via Our World in Data · `co-emissions-per-capita.csv`, filtered to
3-letter ISO codes with a value present, year 2023. Bins are 4 tonnes wide, 10 bins, 0-40 —
`references/types/histogram.md`'s own "value range divided into about ten roughly-round bins"
default.

## Task 0's probe (W4) — this beat is the one the size table rests on

`probe/` draws this same histogram at 1920×1080, 1080×1080 and 1080×1920 and measures it. The
spec's question 4 — *did anything outside {typeScale, tick hints, collision thresholds} need
editing?* — answers **TRUE**: eleven bare spacing literals in this file's own layout arithmetic
(`+ 28`, `+ 22`, `+ 34`, `+ 8`, `+ 24`, `+ 6`, `+ 10`, `+ 20`, `+ 4`, `+ 16`, `− 10`) are 900×560
tuning under no name, and leaving them unscaled collided the title into the subtitle at landscape.
Question 3 splits: everything that goes through `measureText` re-derived with no edit; the literals
did not. `probe/VERDICT.md` is what was seen when the three PNGs were opened — including the one
finding no counter caught, that portrait comes back with zero clipping, zero collisions, 84% plot
fill **and a destroyed distribution shape** (plot aspect 2.35:1 → 0.54:1).

## What went wrong, caught by looking

Two real catches. First, during research a bash `sort -k4 -n` pass on a header-included file
misled me into quoting a median of 3.74 t — a sort artefact, not the real value; cross-checked with
a clean Python computation once the render script's own number (3.1 t) disagreed with my notes.
Second, the alt text I first wrote hard-coded "a dashed median line sits at 3.7 tonnes" from that
same wrong number — caught by reading the rendered `<desc>` against the visible on-chart label
("Median: 3.1 t"), which disagreed with each other; the alt text now interpolates the script's own
computed value instead of a typed guess.
