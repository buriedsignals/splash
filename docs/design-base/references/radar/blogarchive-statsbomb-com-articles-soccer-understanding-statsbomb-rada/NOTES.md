# StatsBomb — Understanding StatsBomb Radars (Harry Kane, striker template)

- url: https://blogarchive.statsbomb.com/articles/soccer/understanding-statsbomb-radars/
- archive: url-list
- type: radar — twelve spokes, one filled polygon, paired with twelve distribution ridges
- export: static raster (`img`, 800 × 553) inside an explainer article
- readAs: the graphic itself. `routes.pixel.measuredFrom = "graphic.png"`, `documentTop 1527`.

## What it is

The desk that invented the football radar explaining its own object. One player — Harry Kane,
Tottenham, Premier League 2020/21, 36.7 90s played — on **twelve spokes** (xG, Shots, Touches In
Box, Shot Touch %, xG Assisted, Pressure Regains, Pressures, Aerial Wins, Turnovers, Successful
Dribbles, xG/Shot, and back round), one closed polygon, filled.

And beside it, occupying the right half of the plate, **twelve density curves** — one per spoke —
each with the population's distribution in grey, the player's own value marked, and a percentile
printed (`0.48 P89`, `3.65 P95`, `10.30 P69`…). The radar and the ridge panel are the same twelve
numbers twice.

## What it does with information

**The radar's weakness is answered on the same plate rather than argued about.** A radar says
"far from the centre"; it cannot say how unusual that is. The ridge column says exactly that: where
this player sits inside the whole population of strikers, per metric, with the percentile written
out. This is the most transferable idea in the record and it costs nothing but space.

**Every spoke carries its own printed scale, in its own units.** Along the xG spoke: `0.57 0.52 0.48
0.44 0.40 0.35 0.31 0.27 0.23 0.19 0.14 0.10 0.06`. Along Shots: `3.9 3.7 3.4 …`. The radius is a
percentile position but the number a reader sees is the real per-90 quantity. So the spokes are
comparable in RANK while staying honest about being different units — the trap named in
`skills/chart-beat/references/types/radar.md`, met head-on rather than ignored.

**The rings are concentric circles, not a web.** Five or six full circles at even radii, no
polygonal gridlines. The only polygon on the plate is the player's.

**The polygon is filled, and the fill is the club's.** Spurs navy over a sand ground. One item, so
occlusion is not a question; the fill is doing identification, not comparison.

**Provenance is on the plate.** Age and date of birth under the name, minutes played, competition
and season top right, template name ("Striker Radar and Distributions") — everything needed to say
what the percentiles are relative to.

## What it does with style

Measured on `graphic.png`: ground **`#FFFFFF` at 78.43 %**. The two figure colours are
**`#0B539F` at 2.44 %** (hue 210.8°, the polygon) and **`#DEB887` at 2.13 %** (hue 33.8°, the
plate behind it) — a near-complementary pair, and the classifier reads the palette as
`"diverging"`. Then **`#DB2429` at 0.37 %** and **`#171E64` at 0.21 %**, which is the wordmark and
the warm end of the ridge ramp. `#DCB686` (0.16 %) and `#18267C` (0.086 %) are antialias
neighbours of the first two, not further colours.

The gridline furniture is a two-step grey: **`#DDDDDD` at 5.67 %** and **`#CCCCCC` at 1.45 %**,
with `#F4F4F4` at 0.59 %. Nearly six per cent of the plate is ring, which is a lot — a twelve-spoke
radar spends real ink on its own scaffolding, and that is a cost of the form rather than a defect
in this drawing.

**The type in this record is the article's, not the graphic's.** `style.graphic.tag` is `img`, so
the tuples describe StatsBomb's blog: Barlow throughout — 88/300 for the headline, 24/400 for body,
24/700 for the section heads, 16/400 at 0.4 tracking uppercase for the kicker, in `rgb(19,41,63)`,
`rgb(35,42,49)`, `rgb(101,109,115)` with links at `rgb(2,115,227)`. Measure is 800 px / 67 ch.
`style.marks` (`fill rgb(255,99,0)` ×2) is the site's iconography.

## What is transferable

- **Pair the radar with a per-axis distribution.** The shape gives the profile; the ridges give the
  rarity. Neither substitutes for the other and both fit on one plate.
- **Print each spoke's own scale in its own units** even when the radius is a rank. It is the only
  honest way a radar can carry axes that are not commensurable.
- **Concentric circles for the grid, and the only polygon on the plate is the data's.** A polygonal
  web competes with the shape it is supposed to support.
- **Put the denominator on the plate**: minutes played, season, competition, template, the
  population the percentile is against.

## What was not verified

- **Whether the radius is percentile or raw value.** The printed tick sequences are unevenly spaced
  in value along at least the xG spoke, which is what a percentile radius with real-unit labels
  looks like — but the page's own words on this were not read, only the picture.
- Where the polygon's boundaries come from (the piece's text mentions top/bottom 5 % bounds
  elsewhere on the site; not confirmed for this template from the captured region).
- The ridge column's grey/warm ramp was not measured separately from the plate as a whole.
- **The lettering inside the graphic was not measured**; it is a raster.
