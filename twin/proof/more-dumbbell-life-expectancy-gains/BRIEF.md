# Beat — Life expectancy gains, ten countries, 2000-2023

**Type:** dumbbell (range plot). **Medium/genre:** chart / static. **Channel:** article web, 900 x
860 (taller than the 900x560 default — a per-story FRAME choice, 10 rows on one shared scale plus
a legend and a bottom value axis need more vertical room than the default gives).

## Claim

Every one of these ten countries added years of life expectancy between 2000 and 2023 — Poland
gained the most, +5.0 years; the United States gained the least, +2.5 years.

## Subject and accent

No single "subject" hue here — a dumbbell has two colour ROLES instead, one per series being
compared, not one accent plus neutrals. Two CVD-safe Okabe-Ito hues, capped at exactly two per
`references/types/dumbbell.md`: `#0072B2` (blue) for 2000, `#D55E00` (vermillion) for 2023, this
codebase's existing pair. Because there is no positional convention here telling a reader which
dot is which series (unlike a slope chart's left-is-earlier reading), the small legend naming the
two colours is load-bearing, not decorative — the deliberate exception to this discipline's usual
"direct end labels, not a legend." Rows are sorted by gap size, descending, so Poland's 5.0-year
gain sits at the top and the United States' 2.5-year gain at the bottom. The value scale is one
shared linear scale across all rows, fitted to the data's own extent and NOT anchored at zero —
position encoding, like a slope chart, not length encoding like a bar.

## Source

UN, World Population Prospects (2024), via Our World in Data ·
`life-expectancy.csv?country=~FRA~DEU~ITA~JPN~NLD~POL~ESP~CHE~GBR~USA&csvType=filtered`, ten
countries, filtered to Year 2000 and Year 2023 in code (`render.mjs`), 20 rows used out of 1,418
fetched (the endpoint returns every year 1816-2023 for the ten filtered countries, not just the
two years the beat needs).

## What went wrong, caught by looking

Nothing needed fixing after the first render. The category-label gutter (measured against
`United Kingdom`/`United States`, the widest names in this set) and both value-label gutters
(measured against the widest `XX.X` string in each column) left every label clear of both the
frame edge and its neighbour on first render — no truncation, no overlap. Looking at the PNG
confirmed: rows run top-to-bottom in gap-size order (Poland 4.99 down to United States 2.50); the
legend swatches read as "2000" (blue) / "2023" (vermillion) above the plot; every value label sits
in black ink outside its own dot, never inside either accent colour; the connector line is a
muted, thin, neutral grey that reads as scaffolding under the two dots, not a third mark competing
for attention.
