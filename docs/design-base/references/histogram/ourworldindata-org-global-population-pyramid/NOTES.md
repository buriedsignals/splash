# Our World in Data — *The Demography of the World Population from 1950 to 2100*

`https://ourworldindata.org/global-population-pyramid` · harvested 2026-09-08 · archive recorded as
`url-list` (found by search, not drawn from the url list file).

## What it is

**At the family's edge, and filed as such.** The record's graphic is an `img` 845 × 586 at
`documentTop` 1637, `nearTheTop: true`, `routes.pixel.measuredFrom: "graphic.png"`, and it is the
piece the url names: OWID's own plate titled *The Demography of the World Population from 1950 to
2100*, subtitled *Shown is the age distribution of the world population – by sex – from 1950 to 2018
and the UN Population Division's projection until 2100.* The consent dialog was dismissed
(`consent: button "Accept optional cookies"`).

It is a distribution of a continuous variable (age) mirrored by sex about a shared zero — the same
job as `populationpyramid-net-world-2023` — but **it is not drawn as bars**. Each of nine dated
populations is a filled silhouette, nested inside the next, so what would be twenty-one bins is a
continuous envelope. This is precisely the alternative the type sheet names when it says a density
curve reads better than overlapping bars for comparing distributions: here, nine distributions on
one plate, which no binned rendering could hold.

Filed for what it says about **when a histogram should stop being a histogram**, and the note says
plainly that it draws no bins.

## What it does with information

- **Mirrored about a shared zero**, `Men` left and `Women` right, named in words at the foot of each
  half at display size — the same convention as the other pyramid in this family, reached
  independently.
- **The value axis is drawn once, along the top, and counts outward from the centre**:
  `70 Million 60 … 10 Million | 10 Million … 60 70 Million`. Both halves on one scale; the unit is
  written into the tick, not banished to an axis title.
- **The age axis is on the left in the variable's own unit** — `10 years`, `20 years`, … `90 years`
  — labelled every ten years on a one-year resolution. Bin edges, not bin index; and because the
  resolution is one year, the "bins" are effectively the data.
- **Every silhouette is labelled in place, on the shape itself**, with its year set along the slope
  of the curve: `1950 1960 1970 1980 1990 2018 2050 2075 2100` on both halves. There is no legend
  anywhere on the plate. Nine series, nine direct labels, twice.
- **A ranked reading is set out in the right margin as a list**: the median age at each of five
  dates, in the same order as the shapes. The plate answers "which of these is which, and by how
  much" without a second chart.
- The title states the span, the subtitle states which portion is observation and which is
  projection, and the projected years (`2050 2075 2100`) are the outermost shapes — so where the
  evidence stops is legible from the geometry.
- Source, licence and author are on the plate, bottom left and right.

## What it does with style

Measured on `graphic.png`:

| role | measured |
| --- | --- |
| ground | `#FEFEFE` at 36.04 % — the plate is more ink than paper |
| oldest cohorts | `#3E5189` at 11.131 %, with `#3C84B4` 2.108 % |
| middle | `#56BC9D` at 6.349 %, `#52B3A2` 2.299 %, `#57C09F` 1.810 % |
| newest / projected | `#E3EC7C` at 3.819 %, `#E9F37B` 1.794 %, `#DDE57C` 1.489 % |
| palette shape | `categorical`, three clusters at hue 225 (17.71 %), hue 161 (13.15 %), hue 65 (13.19 %) |

The three clusters are one **navy → teal → chartreuse ramp read as time**: earliest dates deepest,
latest lightest, so the plate's chronology is carried by the ramp and the nesting together and a
reader who ignores the labels still reads the direction. The classifier calls it `categorical`
because the three clusters are far apart in hue; the plate uses it as a sequence.

At 36 % ground the plate is unusually saturated for this corpus — the other five records here run
80–85 % ground. A nine-series distribution is simply a lot of ink.

Page type is OWID's article furniture, not the plate's: `Playfair Display | 40 | 600 | trk -0.16`
for the article title, `Lato | 18 | 400` for body, `Lato | 12 | 900 | trk 1.2 | uppercase` for
section eyebrows, `Menlo | 14 | 500` for the citation. The graphic is a raster `img` with no
`graphicFrame`, so the plate's own serif title and its year labels were read by neither route.

## What is transferable

- **Nine distributions on one plate, by nesting envelopes instead of binning.** The rule to take
  from this is a *threshold*: one or two distributions can be bars; nine cannot, and the honest
  move is to drop the bins rather than to overlay them.
- **Mirroring about a shared zero, with both halves named in words** — corroborates
  `populationpyramid-net-world-2023` from an independent publication.
- **The unit inside the tick** (`70 Million`, `10 years`) rather than in an axis title.
- **Direct labels on the shapes, no legend, on both halves.** Nine series and not one key.
- **A ramp used as time.** Navy → teal → chartreuse, oldest to newest, with the projected years at
  the light end, so "this part has not happened yet" is legible before the caption is read.
- **A margin list that ranks what the shapes only imply** — median age per date, in shape order.

## What was not verified

- **The plate's own type.** Raster `img`, no `graphicFrame`; all type in the record is the OWID
  article.
- **Whether the ramp is a documented OWID scale or this plate's own.** Nothing in the record says.
- **Where observation ends and projection begins, on the picture.** The subtitle says 2018; the
  plate does not visibly change treatment at that boundary, and this note does not claim it does.
- **The `#FEFEFE` ground at 36.04 %.** That is the paper *inside the plate's frame* as photographed;
  the plate is dense and the figure is unusually low for this family, which is stated above as an
  observation rather than used as a direction.
- The page was read **after a consent dialog was dismissed** (`"Accept optional cookies"`).
