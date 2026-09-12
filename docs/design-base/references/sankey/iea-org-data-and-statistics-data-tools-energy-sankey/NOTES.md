# IEA — Energy Sankey (World, 2023)

## What it is

The International Energy Agency's *Energy Sankey*: the full world energy balance as a five-column
flow diagram — `Domestic production` and `Imports` on the left, fuels, then transformation
(refineries, power and heat plants), then carriers, then `Final consumption` broken into
`Residential`, `Industry`, `Transport` and the rest, with `Exports` and `Losses` as sinks. Roughly
forty nodes and a hundred-odd links on one screen.

**What was actually read**: the piece's own graphic, an inline `svg` 1210 × 680 sitting 1 524 px
down the page (`style.graphic`), photographed as an element after being scrolled into view and
allowed to settle. Confirmed by eye: it is the diagram, complete, no site chrome in frame. Both
routes `ok`.

Because the graphic is an inline SVG in the article's own document, `record.style.type` legitimately
contains **both** the page's furniture and the diagram's own labels, and they have to be told apart
by size — which the record makes easy, because the diagram's labels are the only tuples under 12 px.

## What it does with information

This is the reference for what the form looks like when it is doing its real job — many stages,
many flows, conservation actually at stake — and three decisions carry it.

**Nodes are ticks, not boxes.** Each node is a hairline vertical rule with its name set beside it.
There is nothing to fill, so the node contributes no colour and the ribbons own the picture. The
few nodes that *are* filled are filled grey (`fill rgb(228, 228, 228)`, 5 marks in
`record.style.marks`) and are the columns' bounding rails — `Final consumption` on the right,
`Transformation` in the middle — which are furniture, not data.

**Hue belongs to the source and travels.** A ribbon leaving `Natural gas` keeps its blue into
`Power & heat plants` and out again into `Residential`; the reader tracks a fuel across four
columns by colour alone. Twelve distinct hues appear in `record.style.marks`, well past the six the
family's own type note caps a categorical palette at — and the cap survives, because most of those
twelve are carrying almost no area (see below).

**Small flows are drawn, not dropped.** The diagram is full of hairline ribbons a pixel or two
thick: `Electricity imports`, `Stocks`, `Transfers`, `Statistical differences`. A sankey's
arithmetic promise is that every node balances, so a flow that is dropped for being small breaks the
promise silently. IEA keeps them and shrinks the label instead — there is a **third type size**,
`Graphik 9 / 400`, whose sample in the record is exactly `Electricity imports`.

And the balancing items are set apart typographically. The record carries a
`Graphik | 10.4 | 400 | **italic**` register, six occurrences, sampled on `Stocks` — used for
`Own use & losses`, `Oil for power & heat`, `Transfers`, `Statistical differences`, `Non-specified`.
These are the terms that exist so the arithmetic closes rather than because a reader came looking
for them, and italic says so without a legend. (In the graphic they also read lighter than the
node names; the computed colour the record holds for that register is `rgb(0, 0, 0)`, so the
lightness is not a measured fact and may be opacity the style route did not resolve.)

Column headings — `Final consumption`, `Transformation` — sit above their column in the same
lighter treatment, naming the stage the way Ferdio's `2004` / `2022` do.

## What it does with style

Pixels, measured on `graphic.png` (`record.pixel`, `measuredFrom === "graphic.png"`):

- ground `#FFFFFF` at **70.51 %**;
- **the largest single non-ground colour in the diagram is a neutral**: `#A1A1A1` at **5.31 %**,
  with `#D0D0D0` at 3.88 % behind it. Only then come the hues — `#92E5FF` 4.25 %, `#FFD48E` 3.65 %,
  `#FFF89C` 1.23 %, `#66CEC7` 1.00 %, `#D0B7F5` 0.37 %;
- the tints `#C9F2FF` 0.33 %, `#FFEAC6` 0.32 %, `#B3E7E3` 0.25 %, `#ADECFF` 0.24 %, `#A4F8BF` 0.22 %
  are the same hues where ribbons overlap or run at reduced opacity.

So: **grey is the biggest ink in the picture**, and it is carrying the flows nobody is being asked
to track — losses, own use, unallocated. That is the type note's "neutral scaffolding" not as
advice but as a measurement, on a diagram whose designer had twelve hues available and spent the
largest share on none of them.

Marks, from the style route (`record.style.marks`): **every ribbon is drawn at 60 % alpha** —
`fill rgba(177, 177, 177, 0.6)` ×24 (the neutral, and the single most-used ribbon fill),
`rgba(73, 211, 255, 0.6)` ×22, `rgba(255, 183, 67, 0.6)` ×22, `rgba(0, 173, 161, 0.6)` ×20,
`rgba(99, 99, 99, 0.6)` ×16, `rgba(255, 244, 90, 0.6)` ×12, `rgba(255, 117, 75, 0.6)` ×11, then
singles and pairs. A second set at **0.25 alpha** — five entries, one per major hue — is the same
palette dimmed, which is how the faint background flows are drawn without leaving the system.
Transparency is what makes a hundred crossing ribbons readable: an overlap darkens, so a bundle
looks like a bundle.

Type: `Graphik`. Node labels `10.4 / 400` (17 tuples), balancing items `10.4 / 400 italic` (6),
smallest nodes `9 / 400` (3). The page around it uses the same family at 14, 17, 22/700, 46/700.

## What is transferable

- **Let the source's hue travel through every stage.** It is the only mechanism that lets a reader
  follow one input to its destination across four columns, and it costs nothing extra.
- **Draw ribbons at partial alpha.** At 0.6, crossings resolve into visible density instead of an
  arbitrary z-order, and the diagram stops depending on draw order to be true.
- **Spend the neutral on the flows nobody is tracking, and let it be the largest area.** Measured:
  `#A1A1A1` 5.31 % against the largest hue at 4.25 %. The categorical cap is respected not by having
  few colours but by making sure the many colours are small.
- **Keep the hairline flows and shrink their label instead of deleting them.** Conservation is the
  form's promise; a dropped flow breaks it invisibly.
- **Set the balancing terms in italic.** A residual is a different kind of thing from a real
  destination, and one typographic axis separates them without a legend.
- **Nodes as hairline ticks** when the ribbons are the subject; filled rails only for the stage
  columns.

## What was not verified

- **Conservation.** The diagram asserts that every node balances and nothing here checks it; no
  underlying numbers were read. This is the one thing this form promises and the one thing a
  screenshot cannot confirm.
- **Interaction.** The page offers hover detail and a fullscreen control (`Enter fullscreen` appears
  in `record.style.type`); no hover was performed, so the tooltip's own contrast — the family's
  named accessibility trap — is **untested here**.
- **The lightness of the italic register.** It reads lighter in the graphic; the record's computed
  colour is `rgb(0, 0, 0)`. Do not quote a grey for it.
- **Whether twelve hues are distinguishable to a colour-blind reader.** Not tested, and at twelve it
  is the obvious risk of this design.
- **Which year and region.** The record's own type carries `Energy system of World, 2023`; the
  control state at the moment of capture was not otherwise recorded.
