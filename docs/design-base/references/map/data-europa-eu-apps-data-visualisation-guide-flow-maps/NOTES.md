# EU data-visualisation guide — "Flow maps", read at Minard's 1862 plate

- url: https://data.europa.eu/apps/data-visualisation-guide/flow-maps
- archive: search
- type: flow map — banded routes whose width is the quantity, converging on one named place
- export: static
- readAs: **the page's lead illustration**, a 768 x 652 reproduction of Charles-Joseph Minard's
  *Carte figurative et approximative des poids des bestiaux venus à Paris sur les chemins de fer en
  1862*. It is an archival lithograph the guide reproduces, not the guide's own encoding, and every
  reading below is of the plate. The guide's own interactive examples sit further down the page and
  were not reached.

## What it is

Livestock delivered to Paris by rail in 1862. Every railway line that carries animals is drawn as a
band whose **width is the tonnage**; the bands run along the routes, merge where lines join, and
converge on a single grey disc labelled `PARIS`. Three tones separate the three kinds of animal
(beef, veal, mutton), stated in a key at the top left with a stated width scale. Two blocks of
explanatory prose sit in the margins, and a small choropleth inset compares the extent of the
markets supplying Paris in 1828 and 1862.

## What it does with information

**The width is the quantity and it is conserved along the network.** A band that splits at a
junction splits its width; two bands that meet make one band as wide as both. Nothing is normalised
per segment, so a reader can follow a thickness from a distant town all the way into the disc and it
means the same thing the whole way. That is `conservation-is-kept-visible` — this base's sankey rule
— met in a geography rather than in a diagram.

**The route is schematic and the geography is furniture.** The bands do not follow the rails
exactly; they are smoothed and offset so that three tones can run side by side along one corridor
without one hiding another. Under them the map is only city names and hairline rail lines, in the
paper's own ink. **The map is what the flow is drawn ON, not what it is drawn OF.**

**The destination is a node, not a place.** Paris is a plain grey disc with its name in it, at the
size the converging bands need, not at the size of the city. Every other place is a name in small
type at the end of its own band. The plate is about arrival, and the one place that is not a
quantity is the one place drawn as a shape.

**The key states the width scale in the data's own units** — "les poids des bestiaux sont
représentés par les largeurs des zones colorées, à raison d'un millimètre pour mille tonnes" — so a
band is measurable, not merely comparable. A flow map without that sentence is a picture of
importance.

**The three tones are a category, and the categories are named in the key with their own colours.**
Nothing else on the plate is coloured.

## What it does with style

The pixel figures are **an 1862 lithograph's**: ground `#EEE9D7` (aged paper) at 27 %, and the
chromatic mass a run of ochres `#E5BD84`, `#E4BB7D`, `#E4C28B` — the beef band, which is the widest
thing on the plate. The pixel route reads it as **sequential**, which is an artefact of the paper and
the fading, not a decision.

**No direction may be measured from this record.** The type is engraved copperplate script; the
style route reached only the EU guide's own page chrome (`Helvetica`, 8 runs, `A deep dive into bar
charts`, `Design principles`). Neither the colours nor the type on this plate are transferable to a
contemporary newsroom palette, and nothing below asks them to be.

## What is transferable

- **Width is the quantity, and it is conserved where routes merge and split.** A reader must be able
  to follow one thickness the length of the network.
- **State the width scale in the data's units, in the key** — so many millimetres per so many
  tonnes — or the bands are only a ranking.
- **Draw the route schematically and the basemap as furniture**: parallel bands need room that real
  geography does not give them, and the map is what the flow is drawn on.
- **Give the destination a node of its own**, sized by what the bands need, and let every other place
  be a name at the end of a band.

## What is this piece's own

The engraved lettering, the aged paper, the three animal tones; the marginal essays.

## What was not verified

- **The guide's own interactive flow maps** — a Sankey-like grouped-flow map and an edge-bundled
  global migration map, both described in the page's prose — were not reached by either route. What
  the guide itself argues about flow maps is therefore not in this record.
- Whether the bands' widths are exact to the stated scale, which would need the source table.
- **One publication.** The eight news pieces drawn for this form in the same pass reached no flow map
  at all; the yield log records that.
