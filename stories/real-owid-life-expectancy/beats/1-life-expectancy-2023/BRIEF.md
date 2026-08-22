# Beat — in 2023 every country under 60 years of life expectancy was in sub-Saharan Africa (web)

**Type:** choropleth. **Medium/format:** map / web. **Channel:** article web, one self-contained
`render/life-expectancy-2023.html` (1 968 KB), plus an always-rendered table of all 241 drawn
regions.

Since ruling **R1** the display surface is a **live MapTiler map** — its own zoom and pan, leashed
to the study area — drawn from this beat's own 241 shapes in lon/lat. The 1200 × 815 baked plate is
spent once and shipped as the **fallback layer**: what a reader gets with JavaScript off, offline,
or on the day a key is rotated. The committed file carries the `__MAPTILER_KEY__` placeholder
(**R1b**), so opening it from this folder shows the plate and makes zero external requests.

## Claim

In 2023 the six countries where a newborn could expect fewer than 60 years of life were Nigeria
(54.5), Chad (55.1), Lesotho (57.4), the Central African Republic (57.4), South Sudan (57.6) and
Somalia (58.8) — every one of them in sub-Saharan Africa. `checkClaim` pins the threshold, the count
and the six codes against the joined values and refuses to render if a seventh country falls under
60 or if the lowest drawn reading stops being Nigeria. The continent half is a **declaration**: the
frozen inputs carry no region column, so it was checked by hand against exactly those six names, and
the pinned list is what forces it to be checked again if they ever change.

## Data

- Source: Riley (2005); Zijdeman et al. (2015); Human Mortality Database (2025); UN World Population
  Prospects (2024) — with major processing by Our World in Data. Shapes: Natural Earth 1:50m Admin 0.
- `life-expectancy-2023.csv`: **237 rows**, `Code,Entity,Year,value`, every row Year = 2023. Cut out
  of the story's frozen 21 565-row panel by `prepare-inputs.mjs`, which drops Our World in Data's own
  24 aggregate rows (the World, the continents, the income bands, "Least developed countries" and the
  rest) because none of them is a territory a choropleth may paint.
- `countries.geojson`: **241 features**, one property each (`ADM0_A3`). Antarctica dropped: no
  reading, and it fills a quarter of any world frame. Simplified once at 0.09° before freezing, so
  the SVG paths and the live layer's lon/lat rings draw the same coastline.

## Why 2023, which the journalist asked to be chosen and explained

2023 is the last year the file carries, and it is not thinner than the years before it: every one of
the 236 ISO-coded countries has a 2023 reading, the same coverage as 2015 through 2022. Nothing is
bought by stepping back a year, and a year older would be a year less current for no gain.

## The join, measured rather than assumed

241 shapes, 237 readings, and neither set contains the other:

- **4 aliases.** Natural Earth `SDS` is the source's `SSD`, `SAH` is `ESH`, `PSX` is `PSE`, and
  `KOS` is `OWID_KOS` — Kosovo has no ISO code of its own. Unaliased, four real countries render as
  no-data and look entirely legitimate.
- **12 shapes with no reading**, declared: South Georgia, the British Indian Ocean Territory,
  Pitcairn, Somaliland, the French Southern and Antarctic Lands, Åland, Northern Cyprus, the
  Australian Indian Ocean Territories, Heard Island, Norfolk Island, Ashmore and Cartier, and the
  disputed Kashmir polygon. They are drawn in the no-reading class, which is on the legend.
- **8 readings with no shape**, declared and stated in the caveat: Bonaire Sint Eustatius and Saba,
  Gibraltar, Guadeloupe, French Guiana, Martinique, Mayotte, Réunion and Tokelau. Natural Earth folds
  each into the state that administers it, so these eight readings appear NOWHERE on this page.
- **229 countries are drawn with a reading**, and that is the number every sentence on the page
  counts — never 237, never 241.

## What this map cannot do

At a world camera a country under roughly 3 000 km² is smaller than a pixel. Monaco holds the highest
reading in the whole file (86.4 years) and cannot be seen or pointed at. The claim is therefore built
on the LOW end — six large countries a reader can find — and the accessible table plus the keyboard
path carry the readings the picture cannot: `Tab` reaches all 241 regions in value order, and the
first stop is Monaco.

## Exact values — the six under 60, and the two the map names (years, 2023)

| Country | years |
| --- | ---: |
| Nigeria | 54.4623 |
| Chad | 55.0692 |
| Lesotho | 57.3749 |
| Central African Republic | 57.4077 |
| South Sudan | 57.6174 |
| Somalia | 58.8158 |
| Japan (highest big enough to point at) | 84.7123 |
| Monaco (highest in the file) | 86.3724 |

## Classes

`[60, 65, 70, 75, 80]` — six classes, round numbers a reader already thinks in rather than
quantiles, because the claim is a threshold. The 2023 file falls 6 / 22 / 38 / 49 / 65 / 57 across
them.

## Colours

`PALETTE.md` at the story root: ground `#16191B`, accent `#D4A853`, `origin: newsroom`, 8.01:1. The
ramp climbs from the ground toward the accent; the beat's own copies of `NO_DATA_FILL` and
`WATER_FILL` are overridden because the shipped values are light-ground constants. See
`NOTES-FOR-MAINTAINER.md`.

## Verified

Four viewport widths (1600/1024/768/375): fits the window, fills a real share of it, nothing scrolls
inside the visual, the plate is never stretched. Driven live with a real key at 1600×900 and
768×1024: one world painted, hover on Nigeria answers "Nigeria : 54.5 years", the camera leash is
derived from the fit. Keyboard: 241 stops in value order, Arrow/Home/End move focus and the tooltip
follows. JavaScript off: the whole beat renders from the plate.
