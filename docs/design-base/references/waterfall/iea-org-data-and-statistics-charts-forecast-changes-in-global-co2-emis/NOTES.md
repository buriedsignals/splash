# IEA — Forecast changes in global CO₂ emissions from electricity generation, 2023-2027

- url: https://www.iea.org/data-and-statistics/charts/forecast-changes-in-global-co2-emissions-from-electricity-generation-2023-2027
- archive: url-list (found by searching the IEA chart library's own FORM filter,
  `https://www.iea.org/data-and-statistics/charts?type=waterfall`, which reports **278** charts;
  it is not a line of `~/Downloads/infoviz-source-urls-alive.txt`)
- readAs: the published chart page at 1440×900. `style.graphic` is an `svg` 1162×500 at
  `documentTop: 521`, `nearTheTop: true`; `routes.pixel.measuredFrom: "graphic.png"`. The graphic
  lives in the host document, so `style.type` is IEA's page furniture AND the chart's own labels
  mixed together.

## What it is

A five-year bridge run twice over: 2023 → 2024 → 2025 as three level bars, then 2025 walked to 2026
through eight regional steps, then 2026 walked to 2027 through eight more. One chart carrying two
consecutive bridges on one axis.

## What it does with information

**The totals are hollow and the steps are filled.** Every absolute level (2023, 2024, 2025, 2026,
2027) is an unfilled rectangle with a hairline outline and a small cyan dot on its top edge; every
step is a solid block. Role is carried by *fill vs. no fill* before it is carried by hue, which
survives a black-and-white print and a deuteranope.

**The axis is truncated and the chart says so in the plot.** `Note: Left axis is truncated` sits in
bold, inside the plotting area, at the height of the first steps — not in a footnote under the
source line. The scale runs 13 800 → 14 300 on a quantity whose true zero is 0; without that line
the step sizes would be read as fractions of the totals, which they are not.

**Green means the emissions fell, not "the bar went down".** The up/down pair is
`#68F394` (0.715 %) against `#FFF45A` (0.942 %), and green is on the steps where the running level
*falls*. The hue is doing editorial work — in this subject a fall is the good outcome — rather than
merely marking a sign.

**Dotted connectors carry the level across every gap**, including across the two total bars in the
middle of the sequence, so the eye never loses the running value.

## What it does with style

Ground `#FFFFFF` at **95.29 %** — a chart that is mostly empty paper, because a truncated bridge
occupies a narrow band. Palette read as **diverging**. Only two chromatic entries matter: the
yellow `#FFF45A` at 0.942 % and the green `#68F394` at 0.715 %, with the totals' marker dot
`#49D3FF` at 0.028 %. Furniture is `#E6E6E6` at 0.943 % (gridlines) and `#000000` at 0.265 % (ink).

Type is `Graphik`: the chart's own tick and axis-title runs are 12/400 (sample `Mt CO2`) and its
category labels 12/500 (sample `Annual global CO2 emissions`); the 14/400, 22/700 and 18/500 runs in
the same record are IEA's site chrome (`About`, `Sign In`, `Energy system`).

**No value labels at all.** Twenty-one bars and not one number on them; the reader gets magnitudes
from the axis and exact values only from the tooltip. That is a real choice and its cost is that a
still export of this chart cannot be read precisely.

## What is transferable

- **Draw an absolute total as an outline and a delta as a fill.** Role before hue.
- **Put the truncation warning inside the plot**, in ink, at the height the reader is looking.
- **Let the up/down hues mean what the subject means** where the subject has a direction that is
  good or bad, instead of a neutral red/green.
- **Run two bridges on one axis** when the argument is "and then it happened again".

## What was not verified

The tooltip's contents (values are not printed, and the harvester reads a page at rest). Whether the
`Note: Left axis is truncated` string is authored per chart or emitted by the template. The 45°
rotated category labels are legible in the capture but their truncation rule was not tested at a
narrower viewport. One publication.
