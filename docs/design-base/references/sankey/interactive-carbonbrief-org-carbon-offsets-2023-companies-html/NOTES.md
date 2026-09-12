# Carbon Brief — *How some of the world's largest companies rely on carbon offsets*

## What it is

A tall two-column sankey inside a Carbon Brief analysis piece: on the left, the companies buying
carbon-offset credits (`Volkswagen (9,607m)`, `Shell (9,88m)`, `Chevron (6,019m)` down to
`Dell (< 0.001m)`); on the right, the countries the credits come from (`Indonesia (9,256m)`,
`China (6,017m)` … `Uruguay (< 0.001m)`). Roughly forty sources and sixty destinations, every one
of them labelled.

**What was actually read**: the piece's own graphic, an inline `svg` 1318 × 1650 sitting 4 773 px
down the article (`style.graphic`, `nearTheTop: false`) — the harvester walked the page, brought it
into view, let it settle and photographed the element. Confirmed by eye: the whole diagram, top to
bottom, with no article furniture in frame. Both routes `ok`.

Two other Carbon Brief candidates were harvested for this family and **deleted rather than filed**:
*Interactive: How climate finance flows around the world* came back twice with the site's own
newsletter modal painted across the middle of the graphic, which is METHOD correction 3 exactly.

## What it does with information

**The nodes carry the category; the ribbons carry none.** Every one of the 343 links in the diagram
is the same neutral. The only two colours in the picture are on the node bars: violet for a company,
green for a country. Colour therefore encodes *which side of the flow you are on*, which is one bit,
and the diagram spends its entire chromatic budget on it.

That is the opposite of the IEA's choice and it is the right one for this data. Forty sources by
sixty destinations is far past the point where a hue could be tracked; the reader's question is not
"where did Shell's credits go" as a colour-traced path but "who is big, and who buys from where",
and both are answered by thickness and by the label.

**Every node names itself and its own total, in parentheses, in one register.** `Chevron (6,019m)`.
`No country (0,519m)`. The record holds **394 tuples** of `PT Sans Narrow | 12 | 400` in
`rgb(51, 51, 51)` — one type treatment for every label in the diagram, large and small alike. There
is no size hierarchy among nodes: a company worth 9 607 m and one worth `< 0.001m` get the same
12 px. What separates them is the bar, which for the smallest is a one-pixel tick — and it is still
drawn, and still labelled, rather than being rolled into an "other".

**A value below the resolution of the drawing is written as `< 0.001m`** rather than as `0`. The
node exists, the reader is told it is negligible, and the arithmetic is not quietly rounded away.

Nodes are sorted by size within each column but not perfectly — `Apple (0,737m)` sits between
`Shell` and `PetroChina` — which suggests the ordering is a crossing-minimisation, not a ranking.

## What it does with style

Pixels, measured on `graphic.png` (`record.pixel`, `measuredFrom === "graphic.png"`):

- ground `#F9F8ED` at **74.77 %** — a warm cream, Carbon Brief's own paper, not white;
- **the ribbons are 16.03 % of the graphic, at `#E0DFD5`** — a single neutral one step darker than
  the ground — with `#CAC9C0` at 2.12 %, `#EDECE1` 0.84 %, `#D5D4CB` 0.77 %, `#E6E5DB` 0.52 % as
  the darker and lighter bands where ribbons overlap or thin out;
- **the two hues together are about one per cent of the picture**: `#544CDC` at **0.53 %** and
  `#02F59B` at **0.53 %**, with `#73F6C1`, `#5C54DD`, `#12F5A1`, `#44F6B1`, `#8AF7C8`, `#B5F7D7` all
  rounding to 0.00 % as edge antialiasing.

Sixteen parts scaffolding to one part accent, and the accent is on the two thin rails at the edges.
The palette shape is reported `diverging`, which is an artefact of two saturated poles far apart in
hue with a large neutral mass between them.

Computed from those hexes: the ribbons sit at **1.26 : 1** against the ground (`#E0DFD5` on
`#F9F8ED`) — an area that large does not need more, and a line that thin could not survive on it.
The violet node clears every floor at **5.71 : 1** (`#544CDC` on `#F9F8ED`); **the green does not**,
at **1.35 : 1** (`#02F59B` on `#F9F8ED`), which is under the 3.0 non-text floor by a wide margin.
Sixty country bars are drawn in a colour a reader cannot reliably separate from the paper. They
survive because each one is also a labelled tick against a ribbon, so nothing depends on seeing the
green — but the colour is doing no work it could be relied on for.

Marks, from the style route (`record.style.marks`): `stroke rgba(0, 0, 0, 0.2)` ×343 — the ribbons
are **translucent black strokes**, not fills, so where flows bundle the overlap accumulates and the
density itself becomes readable; `fill rgb(84, 76, 220)` ×167 and `fill rgb(2, 245, 155)` ×130 are
the two node columns.

Type: `PT Sans Narrow 12 / 400` for all 394 node labels; `PT Sans Narrow 28 / 700` for the chart's
own heading `Where companies buy offsets from`; `PT Sans 16 / 400` for the unit note
`Millions of carbon-offset credits, each equivalent to 1t CO…`; the article around it is `Pt serif`
20 and 16.

The unit is stated in a subhead under the chart title rather than on an axis, which is the only
place it could go — a sankey has no axis to hang it on.

## What is transferable

- **When the flows cannot be colour-tracked, put the colour on the nodes and leave the ribbons
  neutral.** Measured: 16 % neutral ribbon against 1 % accent. This is a complete and defensible
  alternative to the IEA's travelling hue, and the choice between them is set by whether a reader
  could ever follow one ribbon.
- **Draw ribbons as translucent strokes so density is honest.** Bundles darken; nothing depends on
  which link was drawn last.
- **Every node label carries its own total, in parentheses, in one register.** No legend, no axis,
  no size hierarchy, and the reader can read any single value exactly.
- **Write `< 0.001` rather than dropping the node.** Conservation stays visible and the reader is
  told the flow is negligible instead of being told nothing.
- **State the unit under the chart's own title.** There is no axis to carry it.
- **A warm ground, and a neutral for the ribbons one step off it.** `#E0DFD5` on `#F9F8ED` is a
  very small step, and it works because the ribbon mass is enormous.

## What was not verified

- **Conservation.** Not checked; no underlying data was read.
- **Whether the low-contrast green was a considered decision.** The ratios above are computed from
  the record's hexes; nothing on the page says whether the designer measured them. The reading that
  the green is redundant rather than load-bearing is an inference from the labelling, not a fact the
  record carries.
- **Interaction.** No hover was performed. Whether the piece names a flow on hover — and if so
  whether it paints that name in the flow's colour, the family's named trap — is untested.
- **Whether the node ordering is algorithmic.** Inferred from `Apple` sitting out of rank order;
  not confirmed.
- **Independence from the rest of Carbon Brief.** This record's host is
  `interactive.carbonbrief.org`; a guard that reads independence off the hostname would treat it as
  distinct from `carbonbrief.org`. It is **not** — it is the same publication, and it must not be
  used to corroborate another Carbon Brief reference.
