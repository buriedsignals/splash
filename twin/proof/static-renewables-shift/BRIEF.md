---
size: landscape
type: slope
---

# Beat — Germany's renewable share nearly doubled in nine years

**Type:** slope. **Medium/genre:** chart / static. **Channel:** article web, 900 x 560.

## Claim

Germany's renewable share of electricity generation rose from 29% in 2015 to 59% in 2024 (+29.2
percentage points) — the steepest climb of six countries compared here. Norway, already at 98% in
2015, had almost no room left to climb (+0.7pp).

## Subject and accent

Germany is the named subject: the accent line, bold end labels; the other five countries stay
neutral. Exactly two moments (2015, 2024) per `references/types/slope.md` — not a line chart in
disguise. Value axis is fitted, not zero-anchored (position encoding, not length).

## Source

Same underlying `electricity-mix.csv` pull as the wind-vs-solar and electricity-mix-source beats,
2015 and 2024 rows, renewables computed as (other renewables + bioenergy + solar + wind +
hydropower) / total generation.

## What went wrong, caught by looking

Nothing broke in the render, but the label de-collision pass (needed because Sweden/Switzerland
sit 1pp apart in 2015, and again in 2024) was worth verifying at the pixel level, not just trusting
the algorithm — confirmed by looking that the two clustered pairs (Sweden/Switzerland at both
ends, France/Poland at the 2024 end) separate cleanly with short leader lines rather than
overlapping.

## Size — 2026-08-11

**Pinned: landscape (1920 x 1080)**, in the front matter, read by `readPinnedSize` and verified from
the delivered PNG's own IHDR. It shipped 1800 x 1120 before.

**Square and portrait are refused by `type-at-size.mjs`.** A slope's argument IS a gradient, and
Horak et al. §2.4.2 names line-family types as the ones that resist rotation, so it has no twin
form; no aspect range has been measured for it either. Refusing costs one probe run to reverse; a
slope drawn at an angle nobody chose says a different thing about the same numbers.

**What the migration touched, and what survived it.** The label gutter is still driven by the widest
label MEASURED at the font it is drawn in — the repair that stopped this beat truncating a country
name into its own data — and it re-derives at the new scale with no edit, which is the point of
measuring rather than reserving. The de-collision pass's `MIN_LABEL_GAP` is one line of label type,
so it scales with the frame and is passed into the geometry rather than read from a module constant
the geometry cannot see the scale of. The dot radius and the two line weights were bare numbers and
now scale: a 1.5px line on a 1920px frame is a hairline nobody asked for. The beat also gained a
plot floor of its own — below one label row per series, the de-collision pass pushes every label off
its own line, and no counter in this project sees that.
