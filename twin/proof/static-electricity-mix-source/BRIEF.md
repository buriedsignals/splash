---
size: landscape
type: stacked-bar
---

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

## Size — 2026-08-11

**Pinned: landscape (1920 x 1080)**, in the front matter, read by `readPinnedSize` and verified from
the delivered PNG's own IHDR. It shipped 1800 x 1120 before: a frame stated twice as literals that
agreed with each other, rasterised at x2.

**Landscape, opened.** Six 100%-stacked columns across a 1750px band; the title takes two lines, the
standfirst one, the legend one; every segment over the 48px label band carries its own percentage in
a pole ink measured against the fill it sits on. No ladder rung fires.

**Square and portrait: REFUSED at R9.** Both take the twin form (rows). At a 36px floor the legend's
three items measure 1560px against a 936px frame, so the legend wraps to three lines — a real fix
this migration needed, since the old single-line cursor would have walked the third swatch straight
off the right edge with nothing to say so. With the header, the wrapped legend and a three-line
credit spent, the plot has **less than zero** height left: each of the six bars comes out at
-80.0px (square) and -72.8px (portrait) against a 36px floor. R8 — fewer countries — would remove
the Norway-to-Poland comparison the claim is made of, so the beat refuses and names landscape.
