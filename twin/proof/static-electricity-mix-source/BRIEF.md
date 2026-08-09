# Beat — Norway ran its grid on 99% renewables; Poland leaned on fossil fuel

**Type:** stacked bar (100%-stacked). **Medium/genre:** chart / static. **Channel:** article web,
900 x 560.

## Claim

Norway generated 99% of its electricity from renewables in 2024, the highest share of six
countries compared here; Poland leaned hardest on fossil fuel, at 69% — the highest fossil share
of the six.

## Subject and accent

Composition, not a single subject: three categorical, CVD-safe segment colours (renewables,
nuclear, fossil), fixed in the same stacking order in every column, per
`references/types/stacked-bar.md`. Only one of the three is a warm hue (fossil), so no two adjacent
segments both read warm.

## Source

Same frozen `data.csv` as the wind-vs-solar beat (`electricity-mix.csv`, `by_source`, TWh,
2024) — reused because it was already verified row-by-row for these six countries.

## What went wrong, caught by looking

The first render's bars visibly overran their own "100%" gridline: a hard-coded five-entry tick
label list (`["0","25","50","75","100 %"]`) assumed `.ticks(5)` on a 0-100 domain returns five
values: it returns six (0, 20, 40, 60, 80, 100), so every label was off by one and the true top
gridline was never drawn. Fixed by deriving labels from the real tick array. Separately, a
fixed-240px legend spacing let "Renewables (hydro, wind, solar, bio)" collide with the "Nuclear"
swatch; fixed by measuring each label's real width before placing the next one.
