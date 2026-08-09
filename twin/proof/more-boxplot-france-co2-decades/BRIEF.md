# Beat — France's per-capita CO₂ emissions peaked in the 1970s

**Type:** box plot. **Medium/genre:** chart / static. **Channel:** article web, 900 x 560 (the
default frame — 8 decade-boxes fit it without crowding, no per-story override needed).

## Claim

France's annual per-capita CO₂ emissions peaked in the 1970s (median 9.96 t CO₂ per capita) and
have fallen in every decade since, down to a median of 4.27 t in the 2020s (n=5, a partial decade
covering 2020-2024 only; every other decade shown is a full n=10).

Verified against the computed medians, not assumed: 1950s 5.41 → 1960s 7.59 → **1970s 9.96 (peak)**
→ 1980s 7.43 → 1990s 6.92 → 2000s 6.75 → 2010s 5.17 → 2020s 4.27. Each decade after the peak is
strictly lower than the one before it — `render.mjs` asserts this on its own computed summaries
before drawing, and throws rather than draw a claim its own numbers don't support.

## Subject and accent

One hue (`#0072B2`, Okabe-Ito blue) for every box — a single-group comparison across decades, not
two groups being compared, so `boxplot.md`'s "no more than two, and only if deliberately comparing
two groups" rule keeps it at one. Median line and the one outlier's value label are in ink
(`#000000` on the white ground), never the box's own fill or stroke colour. Decades keep their
natural chronological order left to right — never resorted by median — because this is a
time-ordered categorical axis where the order is itself part of the story (the rise-then-fall
shape would be destroyed by sorting).

The value axis is fitted to the data (`.nice()`d to roughly 4–10.5) and does **not** start at
zero: this is a position encoding, not a length one, so a zoomed range showing the real spread is
the honest choice here — the opposite of the zero-floor rule a bar or lollipop would follow. The
unit (`t CO₂ per capita`) is printed on the top tick.

## Source

Global Carbon Budget 2025, via Our World in Data ·
`co-emissions-per-capita.csv?country=~FRA&csvType=filtered` · France, 1950–2024 (75 annual
readings, verified `Entity` column contains only `France` after fetch), extracted 8 August 2026.

## Outliers — what the Tukey rule found

One decade produced a Tukey outlier: **1980s**, where 1980's own reading (9.54 t) sits above the
decade's upper fence (Q3 + 1.5×IQR ≈ 9.49) — the tail end of the 1970s oil-crisis-era highs
carrying into the first year of the next decade. It is drawn as an individual dot above the 1980s
box, labelled `9.5` in ink, and the 1980s whisker is clipped to 1981's reading (8.53 t), the
furthest point still inside the fence — not stretched up to 1980's own value. No other decade
produced an outlier; `render.mjs` counts them from its own computed summaries (`0` outliers for
the other seven decades) rather than asserting the count.

## What went wrong, caught by looking

Reading `boxplot.md` before writing anything caught a real mistake before it happened: my first
instinct for the whisker was "extend to the group's min/max," which is exactly the shortcut the
type sheet names as the type's one honesty failure — it would have drawn the 1980s whisker
stretching up to 1980's 9.54 t reading, laundering that one elevated year into looking like
ordinary 1980s spread instead of flagging it as the outlier it actually is. Writing
`summarizeDecade` to compute the Tukey fence and clip the whisker to the furthest **non-outlier**
reading, with the outlier plotted separately, was a direct read of the type sheet's own worked
example, not something I would have gotten right from a generic "box plot" memory.

Looking at the rendered PNG (not just a green exit code) also caught one real defect on the first
render: the outlier dot's default position (`b.cx`, the same x as its own box) initially looked
like it might be floating in the gap between the 1970s and 1980s boxes rather than sitting above
its own box — a crop of that region confirmed it is in fact centred exactly on the 1980s box, one
tick above its whisker top, which is correct; no fix was needed, but it would not have been
confirmed without zooming into the actual pixels.
