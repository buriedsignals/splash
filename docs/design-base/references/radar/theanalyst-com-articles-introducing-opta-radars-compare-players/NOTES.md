# Opta Analyst — Slice It Up: Introducing Opta Player Radars (Bukayo Saka)

- url: https://theanalyst.com/articles/introducing-opta-radars-compare-players
- archive: url-list
- type: radar, polar-area variant — ten equal-angle wedges, radius = percentile
- export: static raster (`img`, 768 × 672) inside the explainer that launched the design
- readAs: the graphic itself. `routes.pixel.measuredFrom = "graphic.png"`, `documentTop 1808`.

## What it is

Opta's radar as first published, on Bukayo Saka (Arsenal, Premier League 2022-23, 20 years old,
3,191 mins). **Ten spokes drawn as filled wedges rather than a polygon** — Goals, Shots, Touches in
Opposition Box, Aerials Won, Possession Won, Defensive Actions, Touches, Dribbles Attempted,
Chances Created, and back to Goals. Each wedge's radius is the player's percentile against a stated
benchmark, and the percentile is printed inside the wedge.

The article's own body text calls these **"polar area charts"**, which is the accurate name and is
worth keeping: it is the Coxcomb geometry doing a radar's job.

## What it does with information

**The value is written inside its own wedge.** `92`, `80`, `89`, `78`, `66`, `19`, `50`, `59`. No
axis, no ring labels needed, no radius judged by eye. This is the same problem the two StatsBomb
plates solve with a table and with ridges, solved a third way — in place.

**Wedges, not a polygon, so a zero is a zero.** Aerials Won has no wedge at all. On a joined
polygon a low value still contributes a vertex and a visible edge; here the absence is the
statement. That is a real advantage of the polar-area variant over the classic spider and it shows
on this plate.

**Colour groups the spokes into three named blocks, and the names are on the chart.** Wedges are
purple, pink and red by family, and the block names — `ATTACKING`, `POSSESSION`, `PHYSICAL` — are set
in a tiny ring around the hub, at the angles their wedges occupy. So the reader is told what
neighbourhood of the circle means what, which is the answer to the axis-ordering problem
`skills/chart-beat/references/types/radar.md` calls the type's structural weak point: order the
spokes by family and then say so on the plate.

**An outer boundary ring is drawn, and it means 100th percentile.** A light full circle at the
outside with dashed rings inside it, so a wedge is read against a visible ceiling rather than
against nothing.

**The benchmark is a caption, not an assumption.** "Percentile comparison vs. top five European
league forwards over the last 15 years (1,350+ minutes)" sits under the plate; the club crest, age
and minutes sit above it.

## What it does with style

Measured on `graphic.png`: ground **`#F7F7F7` at 75.15 %** — a warm-neutral card, not white. The
three wedge families are **`#885BD2` at 4.48 %** (hue 262.8°), **`#E26970` at 2.73 %** (hue 356.4°)
and **`#FD74AA` at 2.57 %** (hue 336.2°). `#E2696E`, `#865BD2` and `#895CCE` are antialias
neighbours of those three, not further colours. The classifier reads the palette as `"diverging"`,
which is a slight mis-fit: two of the three hues are twenty degrees apart and the set is really a
categorical triad with one outlier.

The furniture is three barely separated near-whites — `#F9F9F9` (1.65 %), `#F7F6F9` (1.13 %),
`#F9F6F6` (0.86 %) — so the ring and the dashed gridlines sit almost at the ground's own value.
The scaffolding is nearly invisible, which works only because every wedge carries its number.

**The type in this record is the article's, not the graphic's.** `style.graphic.tag` is `img`. The
tuples describe Opta Analyst's page: **Big Shoulders Text** for furniture and **Lora** for body —
headline 60/500, body Lora 16/400 in `rgb(0,0,0)`, section heads Big Shoulders 24/700, kicker 12/500
at 1 tracking uppercase, and the phrase `polar area charts` set in Lora 16/400 italic. Measure
768 px / 96 ch. `style.marks` is site chrome (`fill rgb(10,10,10)` ×10, whites, one gradient
reference) and describes nothing of the radar.

## What is transferable

- **Write the value inside the mark.** On a radar this removes the entire ring-labelling problem.
- **Draw wedges rather than a joined polygon when the item is alone**, so a zero can be drawn as
  absence.
- **Group the spokes into named families, colour by family, and print the family names on the
  plate.** It converts an arbitrary axis order into a stated one.
- **Draw the ceiling.** A visible outer ring is what turns a radius into a percentage.
- **Caption the benchmark.** A percentile with no stated population is not a measurement.

## What was not verified

- Whether the tiny hub ring reads at all at the size this graphic is served — it is at the edge of
  legibility in the 768 px raster and was read here only by enlarging.
- Whether wedge angle is exactly equal for all ten spokes (it looks so; not measured).
- Whether `19` (Possession Won) and the absent Aerials Won are the same encoding at different
  values, or whether a floor is applied below some percentile.
- **The lettering inside the graphic was not measured**; it is a raster.
