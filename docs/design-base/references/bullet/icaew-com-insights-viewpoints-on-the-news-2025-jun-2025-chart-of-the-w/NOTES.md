# Chart of the week: NATO defence spending — ICAEW

`https://www.icaew.com/insights/viewpoints-on-the-news/2025/jun-2025/chart-of-the-week-nato-defence-spending`
harvested 2026-09-08 · archive `search` · both routes `ok` ·
`routes.pixel.measuredFrom` = `graphic.png` (an `<img>`, 570 × 760 at `documentTop` 655).
`style.typeSource` = **"the page only — the graphic is a raster and carries no type this route can
read"**, so **no type tuple below is quoted as the graphic's**; the plate's own lettering was read
by eye.

## What it is

A **measure-against-three-successive-targets chart that is not a bullet**: two stacked columns, USA
and *Europe and Canada*, where the bottom segment is the actual (`Defence spending in 2024`) and each
segment above it is **the gap that would have to be closed to reach the next target** — 2.0 %, then
3.5 % of GDP, then 5.0 % including defence-related spending. Every segment is labelled with its own
value and the column total sits above the column.

```
USA                  £732bn actual  ·  (no 2.0 % segment)  ·  £67bn to 3.5 %  ·  £342bn to 5.0 %   → £1,141bn
Europe and Canada    £408bn actual  ·  £36bn to 2.0 %      ·  £271bn to 3.5 % ·  £301bn to 5.0 %   → £1,016bn
```

Published as the institute's weekly chart, credited on the plate: `6 June 2025. Chart by Martin
Wheatcroft FCA. Design by Sunday. Sources: NATO, 'Annual Report 2024'; ICAEW calculations.
©ICAEW 2025`. What was read is the article's own figure, inside the article, at `documentTop` 655 —
not a hero, not a promo card.

## What it does with information

- **The target is drawn as the shortfall, not as a mark.** A bullet puts a tick where the target is
  and leaves the reader to measure the distance; this chart draws the distance itself, as an area,
  and labels it in pounds. `£271bn to 3.5 % of GDP` is the sentence a bullet's tick only implies.
- **A segment that is already met simply is not there.** The USA column has no 2.0 % band, because
  the USA passed 2.0 % long ago. The absence is the encoding: a reader comparing the two columns
  sees one fewer step on the left. Nothing marks the omission and nothing needs to.
- **Three nested targets on one column**, ordered by ambition upward, so the column's total height is
  "what the most ambitious target costs" and every intermediate height is a real, named commitment.
- **Every segment names its own target in words**, on a leader line to the outside of the column —
  left for USA, right for Europe and Canada, so the two label columns never collide and the two
  plots sit close together.
- **Two entities only.** The chart refuses the per-country breakdown that the same data supports, and
  the comparison it makes instead is the one the piece argues: the USA is already most of the way to
  5 %, Europe and Canada are not.

## What it does with style

Colour from `record.pixel` (`measuredFrom: graphic.png`):

```
ground                  #FFFFFF   68.415 %
actual, 2024            #6CCABA   13.346 %   h 169.7°  chroma 0.371
gap to 5.0 %            #E6A65E    7.344 %   h  31.8°  chroma 0.533
gap to 3.5 %            #B288B8    2.524 %   h 292.3°  chroma 0.189
gap to 2.0 %            #8BD4E6    0.189 %   h 191.8°   — present on one column only
furniture               #F4F4F4 0.370 %, #030303 0.277 %
shape                   categorical, 3 clusters (170°, 32°, 292°)
```

Four hues, one per state, and **the share of the frame each hue occupies is the quantity it
encodes** — 13.3 % for the £1,140bn already spent, 0.19 % for the £36bn Europe still owes on the
oldest target. The palette is unranked and unordered: `pixel.shape` says `categorical`, which is
honest, and it is the one thing about this chart that would not survive translation to a bullet,
where the target's mark must not compete with the measure's.

The plate's own lettering (read by eye, not measured): one sans family throughout, the column totals
in bold above the columns, the segment values in bold inside the segments, the target names in
regular weight outside on leader lines, the credit at 60 % size along the bottom. Segment values sit
in near-black on every fill including the darkest, which is the lightest-tint palette's payoff.

The type tuples the record does carry — `AvenirNextLTW02-Demi 12/400`,
`AvenirNextLTW02-Regular 16/400`, `AvenirNextLTW02-Demi 14/400 uppercase +0.44` and so on — are
**icaew.com's site furniture**, sampled from "Author: ICAEW Insights", "SHARE THIS ARTICLE",
"Membership". None of them describes a label on this chart.

## What is transferable

- **Draw the gap, not the tick, when the reader's question is "how much more".** The shortfall as a
  labelled area answers it in one read; a target tick answers it only after a subtraction the reader
  performs by eye against an axis.
- **Let a met target disappear.** Rendering a zero-height segment, or a tick behind the bar's own
  end, both cost ink to say nothing. Omitting it says "already passed" at no cost, provided the
  reader has a second column to compare against.
- **Nest several targets on one mark.** Where a subject carries a sequence of commitments (2 %, then
  3.5 %, then 5 %), one column carrying all three is stronger than three charts or three ticks,
  because the increments become comparable with each other.
- **Name each threshold beside the segment it belongs to.** The words `to 3.5 % of GDP` do the work
  a legend would do worse.
- **Two entities is enough** when the argument is a contrast rather than a ranking.

## What was not verified

- **No type from the graphic.** The plate is a raster; `style.typeSource` says so explicitly. Sizes,
  weights and families of the chart's own lettering are unmeasured and none is quoted.
- The `#B288B8` purple is filed by the pixel route under **both** `chromatic` (2.524 %) and, as
  `#B288B6`, under `neutral` (1.212 %) — one fill straddling the chroma floor at two antialias
  tints. Its true coverage is the sum, ~3.7 %, and neither list alone is right.
- Whether the £ figures are NATO's or ICAEW's conversion was not checked; the plate says
  "ICAEW calculations" and the numbers are sterling against a NATO source in dollars.
- The chart was read as a still. Whether the article carries a second, interactive version was not
  established.
- **ICAEW is a professional institute, not a newsroom.** It publishes a weekly chart to a newsroom
  cadence with a named designer, and it is treated here as an independent publication — but it is not
  evidence about what a news desk does.
