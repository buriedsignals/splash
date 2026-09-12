# Datawrapper — "Germany's electricity generation grew by 8.2 TWh in 2025, but renewables accounted for barely any of it"

- url: https://www.datawrapper.de/_/BPRSN/
- archive: url-list (the chart's own published page, reached from Datawrapper Academy's waterfall
  gallery; found by searching the form's own vocabulary, not from the alive-urls file)
- readAs: the published chart page at 1440×900. `style.graphic.tag` is **`iframe`** 640×538 at
  `documentTop: 219`, `nearTheTop: true`, frame `https://datawrapper.dwcdn.net/BPRSN/1/`;
  `routes.pixel.measuredFrom: "graphic.png"`. **Type comes from `style.graphicFrame.type`**;
  `style.type` is datawrapper.de's page furniture.

## What it is

A generation bridge: `Total 2024` (398.7 TWh) → seven sources → `Total 2025` (406.9 TWh), with the
seven steps split by a dotted vertical rule into renewables and non-renewables.

## What it does with information

**The axis is truncated and the total bars are hatched to admit it.** The scale starts near 388, so
the two totals are not full bars — and instead of pretending otherwise they are drawn in a diagonal
grey hatch (`#D2D3D3` 1.233 %, `#EBECEC` 1.056 %, `#E3E4E4` 0.817 %, against `#F3F3F3` 1.294 %),
which reads as "this bar is cut". The steps, whose full extent *is* shown, are solid.

**A divider splits the steps into two groups and each group gets its own subtotal.** The dotted
vertical rule between `Solar` and `Lignite` carries `← Renewable energy +0.9 TWh` on one side and
`→ Non-renewable energy +7.3 TWh` on the other, in Roboto 14/700 with arrows pointing into the
group each subtotal covers. The headline's claim — growth, but barely any of it renewable — is
therefore printed on the chart as two numbers, not left to be summed by the reader.

**One step is annotated in ink and circled.** `Fossil gas alone contributed +8.3 TWh` with a leader
to a hollow ring drawn over the fossil-gas bar. The ring is the only mark on the plate that is not a
bar, a label or a rule.

**Signed labels sit outside every bar in the bar's own colour**, above for `+10.9` and `+8.3`, below
for `−4.5`, `−4.4`, `−1.1`, `−3.9`; the two totals are labelled `398.7` and `406.9` in black.

**Order is causal, not by magnitude.** Within each group the sources run in an editorial order
(hydro, wind, biomass, solar / lignite, hard coal, fossil gas) rather than sorted, and the two
biggest movers land at the right edge of their own group where the group subtotal is stated.

## What it does with style

Ground `#FFFFFF` at **75.58 %**; palette read as **diverging**. Increase `#3CA5A8` at 5.983 %,
decrease `#F76D4C` at 3.740 % — a teal/orange pair rather than red/green. Datawrapper's link blue
`#0289CC` appears at 0.032 % in the source line. Ink `#000000` at 1.475 %.

Type inside the frame is Roboto: 22/700 title, 15/400 subtitle (`Change in public net electricity
generation by source, Germany, 2024 vs 2025, in TWh`), 13/400 for the 30 label runs, 14/700 for the
group headings, 14/400 for the group subtotals, 11/400 source in `rgb(136, 136, 136)`.

## What is transferable

- **Hatch a bar whose base is not the true zero.** It is the cheapest honest way to keep a truncated
  bridge readable, and it needs no footnote.
- **Group the steps and print each group's net.** A bridge with a two-part argument can state both
  parts without a second chart.
- **A teal/orange up-down pair** instead of red/green, on a form whose whole meaning is sign.
- **Circle the one bar the headline is about** rather than emphasising it with a fourth colour.

## What was not verified

The arithmetic was not replayed against Fraunhofer's data: the printed steps
(−4.5 −4.4 −1.1 +10.9 −3.9 +2.9 +8.3 = +8.2) do reconcile 398.7 → 406.9 to one decimal, but the
source table was not fetched. Whether the hatch is a Datawrapper feature or a hand-drawn overlay.
Hover and mobile layout not read. One publication.
