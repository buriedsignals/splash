# Zeitenwende Is Here: NATO To Reach 2% Goal — Statista

`https://www.statista.com/chart/35058/nato-2-timeline/`
harvested 2026-09-08 · archive `search` · both routes `ok` ·
`routes.pixel.measuredFrom` = `graphic.png` (an `<img>`, 756 × 756 at `documentTop` 1420).
`style.typeSource` = **"the page only — the graphic is a raster and carries no type this route can
read"**.

**Same publication as `statista-com-chart-14636-defense-expenditures-of-nato-countries`.** It is
filed for what it *teaches* — a different substitution for the same target — and it corroborates
nothing (`METHOD.md` correction 4).

## What it is

**The bullet's qualitative bands, promoted from backdrop to encoding.** Twelve stacked columns, one
per year 2014–2025, each of full height 31 (the count of current NATO members), split into four
bands by where each member's defence spending sat that year: `<1.0 %`, `1.0–1.4 %`, `1.5–1.9 %`,
`2 %+` of real GDP. The story is the dark `2 %+` band growing from 3 members to all 31.

The type page says qualitative bands "sit behind the bar as neutral, muted zones". Here the bands
*are* the data: the measure has become a **count of members inside each band**, and the target — 2 %
— is the boundary of the topmost one.

## What it does with information

- **The target becomes a category boundary rather than a mark.** `2 %+` is the top band's label; no
  rule, no tick, no reference line exists anywhere on the plate. The reader watches a band grow
  rather than watching bars cross a line.
- **The column total is constant by construction** (31 members, every year), so every column is the
  same height and the whole chart is a part-to-whole over time. That is what makes the substitution
  work: with a fixed denominator, a stacked column is a hundred-percent chart in disguise and the
  eye reads the top band's share directly.
- **The bands are ordered, and their colour is ordered with them** — `<1.0 %` grey, then two blues
  lightening downward, then near-navy for `2 %+`. Order in the legend, order in the stack, order in
  the ramp.
- **The final column is one solid band**, and it is the whole argument: 2025 is a single navy block
  labelled by its absence of any other band.
- **Membership changes are handled in a footnote, not in the geometry**: "Includes countries which
  became NATO members after 2014", "Excludes NATO member Iceland (no armed forces)", "* Estimated"
  for 2024 and 2025. The constant denominator is a decision, and the plate declares it.

## What it does with style

Colour from `record.pixel` (`measuredFrom: graphic.png`):

```
ground             #F4F8FB   63.604 %
1.0–1.4 %          #67AFF9    7.617 %   h 210.4°  chroma 0.573
2 %+               #0A3B7E    6.912 %   h 214.6°  chroma 0.455
1.5–1.9 %          #0766E6    5.276 %   h 214.4°  chroma 0.874
title ink          #0F2741    1.379 %
< 1.0 % (grey)     #ADC5CF    1.601 %   — filed under `neutral`, not `chromatic`
shape              sequential, 1 cluster at hue 210, 24 members, 24.43 % of the frame
```

**Four bands, one hue, and the one band that is not a value is not a hue.** The three bands that are
"some defence spending" are 210.4°, 214.4° and 214.6° — four degrees of spread across the whole
ramp — and the `<1.0 %` band is a desaturated blue-grey the pixel route files as **neutral**. The
band that means "nowhere near the target" is drawn as furniture, which is precisely the treatment a
bullet gives its "poor" zone.

The ramp is not monotone in lightness, and the record shows why: `1.5–1.9 %` (`#0766E6`) has the
highest chroma on the plate, 0.874, higher than either the band above it or the band below. Ordered
by lightness the ramp is correct; ordered by saturation it is not. At the sizes involved this is
invisible, but a two-band version of the same ramp would need to be checked.

Type from the plate could not be read (raster). The tuples on the record — `Open Sans` at 13.5, 15,
14, 13.3 — are statista.com's site furniture and are byte-for-byte the ones on the sibling record;
they describe the site, not either chart.

## What is transferable

- **When many entities share one target, count them into bands instead of drawing each one.**
  Thirty-one bullets in a column is unreadable; one stacked column per year, banded by the target's
  own thresholds, says the same thing and adds time for free.
- **The band below the lowest threshold should be furniture, not a colour.** Measured here: the
  `<1.0 %` band is the only one the pixel route classifies as neutral, and the plate reads correctly
  because of it.
- **Order the band colours by the ramp, and check chroma as well as lightness** — this plate's
  middle band is the most saturated thing on it.
- **A fixed denominator has to be declared on the plate.** Three footnotes here do it in one line
  each.

## What was not verified

- **No type from the graphic** (raster; `style.typeSource` says so). No family, size or weight of the
  plate's own lettering is quoted.
- The band-to-colour assignment above was made by matching legend order to stack order to the pixel
  route's share ranking. The legend swatches themselves were not sampled, so the pairing of
  `#0A3B7E` with `2 %+` rather than with `1.5–1.9 %` rests on reading the picture, and the two are
  close.
- Whether the 2024 and 2025 columns are the same estimate the sibling chart uses was not checked;
  both are marked `* Estimated` and both cite NATO.
- **One publication with the sibling record.** Nothing in this note is corroborated by a second desk.
