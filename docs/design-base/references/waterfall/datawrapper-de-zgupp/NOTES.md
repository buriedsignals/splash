# Datawrapper — "Germany's population is growing thanks to immigration"

- url: https://www.datawrapper.de/_/zgUpP/
- archive: url-list (the chart's own published page, reached from Datawrapper Academy's waterfall
  gallery)
- readAs: the published chart page at 1440×900. `style.graphic.tag` is **`iframe`** 640×552 at
  `documentTop: 219`, `nearTheTop: true`, frame `https://datawrapper.dwcdn.net/zgUpP/1/`;
  `routes.pixel.measuredFrom: "graphic.png"`. **Type comes from `style.graphicFrame.type`.**

## What it is

Two bridges side by side on one scale: 83.1M (2022) → births, deaths, arrivals, departures → 83.4M
(2023), then the same four components again → 83.5M (2024). The four components of population change,
twice.

## What it does with information

**The totals are not bars. They are a dot on a rule.** `83.1M / 2022`, `83.4M / 2023`, `83.5M / 2024`
are drawn as a short horizontal rule with a filled dot and a two-line label, sitting at the running
level. Because the y-axis is zoomed to the differences — the steps are millions, the levels are tens
of millions — a total drawn as a bar would either be off the top of the plot or would flatten every
step to nothing. Drawing the level as a *marker* rather than a *bar* is what makes a zoomed bridge
possible.

**The steps are grouped by a shaded band with a name.** `#EDEDED` at **12.61 %** is two panels:
`Natural population change` over births/deaths, `Net migration` over arrivals/departures. Each band
carries a sentence of ink prose (`Since 1972, deaths have outnumbered births.`, `Since 2010,
immigration has outnumbered emigration.`) — background, name and explanation in one device.

**Only the group's net is labelled, not each bar.** `+693K` over the births bar and `−1M` under the
deaths bar are the components; the reader is given both and left to net them, while the group name
above supplies the interpretation.

**Category labels are rotated 90°** — `Births`, `Deaths`, `Arrivals`, `Departures` — and given a
bounded strip of vertical room under the plot. Eight rotated labels, all short, all readable; this
is the case the form's own guidance calls for rotation as a last resort, and the labels have been
kept short enough to survive it.

**Two bridges, one scale, no small-multiple framing.** They are drawn as one continuous plot with a
gap, so the 2023 total is both the right end of the first bridge and the left end of the second.

## What it does with style

Ground `#FDFDFD` at **64.24 %** with the grouping bands `#EDEDED` at 12.61 %. Palette read as
**diverging**: increase `#1F6D9C` at 8.828 %, decrease `#FA8C00` at 8.021 % — a blue/orange pair,
almost equal in coverage because births and deaths, arrivals and departures are nearly equal in size.
Ink `#181818` 0.809 %, `#000000` 0.769 %.

Type inside the frame is Roboto: 22/700 title, 15/400 subtitle (`Number of births, deaths,
immigration, and emigration in Germany, 2023 and 2024`), 13/400 for 27 label runs, 14/700 for the
level labels (`2022`), 13/700 for the group headings (`Net migration`), 11/400 source (`Destatis`).

## What is transferable

- **When the axis is zoomed to the differences, draw the totals as level markers, not bars.**
- **A shaded band that names a group of steps and carries one sentence about it** — grouping,
  labelling and annotation in one move.
- **Two bridges on one scale** where the argument is "and the same thing happened again"; the shared
  total in the middle does the joining.
- **Rotate a category label only after making it one word.**

## What was not verified

The arithmetic: `+693K − 1M + 1.9M − 1.3M` reconciles 83.1M → 83.4M only with the rounding the
labels carry, and Destatis was not consulted. Whether the y-axis zoom is stated anywhere in the
chart — from the photographed rectangle it is not, and a reader could take the bar heights for
shares of the population. Hover and mobile layout not read. One publication.
