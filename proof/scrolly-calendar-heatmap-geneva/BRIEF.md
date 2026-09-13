---
format: scrolly
type: calendar heatmap
---

# Beat — Genève a tenu 31 jours d'affilée au-dessus de 20 °C en 2024 (scrolly)

**Type:** calendar heatmap (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic,
from a phone to a wide desktop.

The `calendar heatmap` type in the scrolly format, drawn once per filed direction from the same data,
streak search, extremes, warmest month, quantile bins, assertions and words as
`static-calendar-heatmap-geneva`.

## The same plate, read in order

| card | what the card says (the static plate's own words) | what the picture shows |
| --- | --- | --- |
| 1 | the mean temperature of each day of 2024 in Geneva, one cell a day | the calendar and its key |
| 2 | the longest run above 20 °C, 18 July to 17 August | the run's outline, drawn in the order of its days |
| 3 | the warmest month is August, not July; the hottest and coldest days | the complete plate |
| 4 | the plate's reading line | the complete plate |

## The static plate's rules, and what the fluid frame asks of them

- **One hue cluster, six bins of roughly equal count**, each printing its break in °C.
- **The impossible dates are drawn as missing**, in a neutral outside the ramp.
- **The streak is outlined in the ink, in the gutter, over a halo of the ground**, one box per month it
  crosses — never in the accent, where it vanished into the warmest bins.
- **The calendar is a CSS grid**: month names, then 31 columns sharing whatever width is left. On a
  phone a cell is narrow and tall; no label is rotated or cut.
- **The outline draws itself day by day** as the reader crosses from card 1 to card 2 — a clip, not a
  scale, so its borders keep their width while it grows.
- **The title steps down a ladder of three forms** until the fixed header fits its share of the frame.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
