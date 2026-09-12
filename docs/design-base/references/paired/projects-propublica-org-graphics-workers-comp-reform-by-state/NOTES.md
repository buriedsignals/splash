# ProPublica — "Workers' Compensation Reforms by State"

- url: https://projects.propublica.org/graphics/workers-comp-reform-by-state
- archive: url-list
- type: three dated snapshots of the same entities, identical geometry, ONE shared legend — plus a
  heat table of the full series
- export: interactive (filter buttons, a state lookup, a sortable table)
- readAs: the live SVG the page draws, at rest, in its default state (`See Them All`); the pixel
  route measured the SVG element itself (`graphic.png`)


> **Also filed under `heatmap`.** One page can carry more than one
> form, and each record is an independent measurement of it. Wherever this page is cited it counts
> as **one publication** for the evidence floor, whichever family does the citing.

## What it is

A tile-grid cartogram of the 50 states, drawn **three times** — `2002`, `2008`, `2014` — side by
side, each state a disc filled from a red-to-green diverging scale (cut benefits → raised benefits).
Below the three panels, the same data as a heat table: states down, every year from 2002 to 2014
across, one cell per state-year.

## What it does with information

**The generalisation of the pair: N states of the same entities, drawn identically.** Same layout,
same disc size, same scale. Nothing but the fill changes between panels, so every difference the
reader sees is a difference in the data.

**One legend serves all three panels, and it is placed outside them.** A single vertical ramp at the
far left, labelled `Cut Benefits` at the top and `Raised Benefits` at the bottom. Repeating it per
panel would have implied three scales; putting it outside says there is one.

**Each panel's title is its date and nothing else** — `2002`, `2008`, `2014` in bold at the panel's
top-left, in the same 13 px the axis uses. The panels do not restate the subject.

**The snapshots and the full series are both drawn, in two forms, on one page.** Three dates as
maps for the shape of the change; every year as a table for the detail. Neither substitutes for the
other, and the table's rows are the map's entities.

**The filter names the three readings the data supports** — `Cut Benefits` / `Stayed the Same` /
`Raised Benefits` / `See Them All` — so the categories the diverging scale encodes are also the
controls. The legend and the interface are the same vocabulary.

## What it does with style

Measured on the SVG (960 × 670, ratio 1.43). Ground `#FFFFFF` at only **22.7 %** — this is a dense
plate — and the palette reads **diverging, two clusters at 8° and 156°**: `#E88D7F` at 13.7 %,
`#ECA08F` at 9.1 %, `#F7D9C0` at 7.4 %, `#EFB4A0` at 6.4 % on the red side, with `#FFFFE0` (10.4 %)
and `#D3E7CA` (5.2 %) classified as neutral because the pale yellow midpoint and the palest green
have too little chroma to count as poles. The style route counts 147 fills of `rgb(232, 141, 127)`,
110 of `rgb(255, 255, 224)`, 94 of `rgb(236, 160, 143)` — a real ramp with a pale yellow centre,
used at both the map and the table.

Type, **six families**, and the split is deliberate: **Helvetica Neue** for everything inside the
graphic — 10 / 400 for the 202 state and legend labels, 13 / 400 and 13 / 700 for the panel dates —
and **ff-tisa-web-pro**, a serif, for the article around it: 15.5 / 200 for the standfirst,
14 / 400 **italic** for the byline, 11 / 700 tracking 0.22 for `SOURCES:`. **Four italic runs, 13
tracked runs, one case-transformed run.** The serif's use of weight **200** for body text is unusual
and is the piece's own.

## What is transferable

- **Draw N states of the same entities as N identical panels and change only the fill.**
- **Put the shared scale outside the panels, once.** A legend repeated per panel says "three
  scales".
- **Title each panel with its date alone.**
- **Make the filter controls speak the legend's vocabulary**, so the categories a reader can select
  are the categories they can see.
- **Pair the snapshot with the full series** — the panels for the shape, a table for the detail.

## What is this piece's own

The red-to-green diverging ramp, which carries a value judgement (cut is bad, raised is good) that
this subject licenses and most do not; the US tile-grid; ff-tisa-web-pro.

## What was not verified

Whether the ramp's class breaks are equal-interval, quantile, or hand-set — the legend shows swatches
without numbers. Whether the three panels share one class scale (they share one legend, which is
strong evidence, but the breaks were not checked). Whether red/green is accompanied by any
non-colour channel for readers who cannot separate them: none was visible.
