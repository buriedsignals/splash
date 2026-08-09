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
