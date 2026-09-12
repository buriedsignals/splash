# Ferdio — 100.datavizproject.com #42 (alluvial, two stages)


> **Also filed under `streamgraph`.** One page can carry more than one
> form, and each record is an independent measurement of it. Wherever this page is cited it counts
> as **one publication** for the evidence floor, whichever family does the citing.

## What it is

A two-stage alluvial diagram: three ribbons run from a `2004` column to a `2022` column, one per
Scandinavian country, thickness proportional to the count of World Heritage sites. Part of Ferdio's
*1 dataset. 100 visualizations.* series, which encodes one small dataset a hundred ways.

**What was actually read**: the piece's own graphic, an `img` 823 × 823 sitting 172 px down the
page (`style.graphic`), photographed as an element rather than cropped out of the page, and
verified by eye — it is the alluvial, edge to edge, with none of the site's navigation in frame.
Both routes returned `ok`.

## What it does with information

The whole diagram is three ribbons and two vertical rules. There is no axis, no gridline and no
legend; the quantity is stated four ways and each one is direct:

- the **thickness** of the ribbon carries the value;
- the value itself is **printed outside the ribbon end**, on the left of the 2004 rule (`13`, `5`,
  `4`) and on the right of the 2022 rule (`15`, `10`, `8`);
- the series is **named inside its own ribbon** (`SE`, `DK`, `NO`) rather than in a legend;
- the two stages are **named once, above their own column** (`2004`, `2022`), which is the only
  furniture the diagram carries.

Two of the three ribbons **cross**, and the crossing is the argument: Denmark passes Norway between
the two dates. Nothing is drawn to mark the crossing — the geometry is left to state it. The
ribbons are separated by a white gutter rather than stacked flush, so each one can be followed
without tracing an edge shared with its neighbour.

## What it does with style

Measured on `graphic.png` (`record.pixel`, `routes.pixel.measuredFrom === "graphic.png"`):

- ground `#FFFFFF` at **82.49 %** — the diagram is mostly air;
- ribbons `#3274D8` at **8.75 %** (SE) and `#EE5440` at **4.37 %** (DK), with the third ribbon (NO)
  reading as the neutral `#283250` at **2.82 %**;
- the palette shape is reported `diverging`, which here is an artefact of two saturated poles
  (a blue and a coral) with a dark neutral between them rather than a real diverging scale;
- the remaining entries — `#2561C9` 0.16 %, `#D5433D` 0.08 %, `#7D9BC5` 0.03 % — are the
  anti-aliased edges of the three ribbons and carry no design decision.

Three ribbons, three colours, and **one of the three is a near-black neutral** rather than a third
hue: the palette does not try to make every flow chromatic.

The series names inside the ribbons are set in white on the saturated fill. That reading is from
the pixels; the graphic is a raster image, so the type route could not measure its size or family.

`record.style.type` for this reference is the **publisher's article furniture**, not the graphic's:
stevie-sans at 16/400 uppercase and Borgia Pro at 18/400 in `rgb(104, 116, 126)`, which is
Ferdio's website. `record.style.marks` likewise reports the page's own three marks
(`fill rgb(255, 255, 255)` ×31, `fill rgb(37, 97, 201)` ×2), not the chart's.

## What is transferable

- **Print the value outside the ribbon end and name the series inside the ribbon.** Both readings
  are then where the reader's eye already is, and the diagram needs neither axis nor legend.
- **Name the stage above its own column.** Two words of furniture replace an axis.
- **Let the crossing be the argument and do not decorate it.** The reason to reach for this form
  rather than two bars is that a reader can see a reordering happen; anything drawn on top of it
  competes with the thing it is pointing at.
- **A third series can be a neutral.** Two accents and a dark neutral read as three tracked flows
  without a third hue entering the palette.
- **White gutters between ribbons.** A shared edge makes two flows one shape.

## What was not verified

- **The graphic's own typography.** It is a raster `img`; the labels inside it are pixels. Size,
  family and weight of `SE` / `DK` / `NO` and of the value labels were **not measured** — only seen.
  Everything in `record.style.type` belongs to the surrounding Ferdio page.
- **Whether the layout is generated or drawn.** A hundred hand-composed posters is Ferdio's stated
  premise; nothing here proves the ribbon geometry came from a layout algorithm rather than a
  designer, and the two would be indistinguishable at this size.
- **Conservation.** The diagram is a two-stage transition where each series keeps its identity, so
  no node has to balance inflow against outflow; the arithmetic promise a multi-stage sankey makes
  is simply not made here. Nothing was checked because there is nothing to check.
- **Interaction.** The reference is a still image on a page; whether the piece has a hover state
  was not tested.
- **Independence.** This is one of three references in this family from `100.datavizproject.com`
  — one publication, one house style, one dataset. It corroborates nothing that the other two say.
