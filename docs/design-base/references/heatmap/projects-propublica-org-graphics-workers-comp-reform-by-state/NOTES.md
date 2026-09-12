# ProPublica — "Workers' Compensation Reforms by State"

- url: http://projects.propublica.org/graphics/workers-comp-reform-by-state
- archive: url-list
- type: heatmap (matrix), state × year, with a paired tile cartogram
- export: web
- readAs: the live page at rest, both routes green — the matrix photographed as its own SVG element
  (`graphic.png`, 960 × 670), the page's type read off the live DOM

## What it is

A 2015 ProPublica graphic accompanying an investigation into a decade of workers' compensation
law. The subject is a **matrix**: fifty rows, one per state, sorted alphabetically and re-sortable
by any column; thirteen columns, one per year from 2002 to 2014; each cell filled by how far that
state's benefits moved that year. Above the matrix, the same scale is spent a second time on three
**hex-tile cartograms** — 2002, 2008, 2014 — so the shape of the change reads geographically before
the reader enters the table.

## What it does with information

**The legend names its poles in words, and each name is set in its own pole's colour.** A vertical
stepped ramp sits to the left of the cartograms, labelled `Cut Benefits` at the dark-red top and
`Raised Benefits` at the green bottom — measured by the style route as
`Helvetica Neue | 10 | 400 | normal | 0 | none`, sample `Raised Benefits`, carrying
`rgb(39, 135, 118)` and `rgb(128, 28, 25)` alongside black. The reader never has to pair a swatch
with a caption on a separate line: the caption **is** the swatch.

**The scale is discrete, not a gradient.** Seventeen distinct cell fills are painted — eleven on the
red side, one pale-yellow midpoint at `rgb(255, 255, 224)`, five on the green. A stepped scale gives
the reader classes to name; a continuous ramp gives them only "more" and "less".

**The scale is diverging around a stated middle** — no change is the palest colour, and the two
directions of change are two hues. The pixel route reads the palette as `diverging`.

**One scale, two graphics.** The cartograms and the matrix share the legend, so the reader learns the
colour once and spends it twice — first on geography, then on chronology.

**The story is a block, not a cell.** Reading the matrix, the red deepens leftward-to-rightward
across whole rows (Ark., Calif., Okla., Tenn.) — the encoding is doing the work a sentence would
otherwise have to do.

## What it does with style

Ground `rgb(255, 255, 255)` (style route, the page's own ground); the pixel route reads `#FFFFFF` at
**22.7 %** of the matrix element, which is the gutter between cells rather than a field.

The cells are strongly non-square and it is a decision, not an accident: measured off `graphic.png`,
each row band is **11 px tall with a 2 px white gutter** (13 px pitch) and each column **68 px wide
with a 1 px gutter** (69 px pitch). Fifty rows in 670 px forces the short dimension; keeping the
columns six times wider makes each year read as a band the eye can travel along.

Four families are in play on one page — `jaf-bernina-sans-condensed` for the display
(34 / 700), `ff-tisa-web-pro` for the running text, `Helvetica Neue` for every label inside the
graphic (13 / 400 for the year headers, 10 / 400 for state rows and the legend), and `Graphik` in
the footer. The header composition is **centred**: title, italic byline, standfirst, all on the axis.

Three of the axes this repository has never used once appear here: an **italic** run
(`ff-tisa-web-pro | 14 | 400 | italic`, the byline), **tracked** runs
(`ff-tisa-web-pro | 11 | 700 | tracking 0.22`, sample `SOURCES:`; `Helvetica | 13 | 200 | tracking
0.26`), and a **200 weight** — lighter than anything in the 122 components measured on 2026-09-07.

## What is transferable

- **Name the ends of a scale in words, and set each name in its own end's colour.** It removes the
  swatch-to-caption pairing entirely, and it works whether the scale is diverging or sequential.
- **Step the scale.** Discrete classes can be named and counted; a gradient cannot.
- **Spend one scale on two graphics** where the beat has both a geography and a chronology, rather
  than giving each its own key.
- **Let the cell be as non-square as the data requires.** A matrix is not a grid of squares; the row
  and column pitches answer to how many rows there are and how far the eye must travel.
- Centred header composition with an italic byline between title and standfirst.

## What is this piece's own

ProPublica's licensed faces, the red/green pair (which carries a political reading in a US labour
story and would not transfer to a beat where the two directions are not "worse" and "better"), and
the sortable-table interaction.

## What was not verified

- **Whether the diverging scale is symmetric.** Eleven red classes are painted against five green.
  That is consistent with a symmetric scale whose outer green classes no state ever reached, and
  equally consistent with a scale built with more resolution on the side the story is about. The
  record cannot tell them apart and no claim is made.
- **Padding and series stroke.** Neither was measured. The cell gutters above are measured; the
  beat's outer padding is not, because the harvested element is exactly the SVG.
- The interaction: "Cut Benefits / Stayed the Same / Raised Benefits / See Them All", the state
  lookup, and the column sort were not exercised. Only the resting state was read.
- Contrast of the pale classes against white was not measured.
- The page is from 2015 and serves over `http`.
