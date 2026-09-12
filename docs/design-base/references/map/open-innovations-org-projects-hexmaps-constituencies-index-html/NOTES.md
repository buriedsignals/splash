# Open Innovations — hex map of UK constituencies

- url: https://open-innovations.org/projects/hexmaps/constituencies/index.html
- archive: search
- type: hex grid — one hexagon per unit, arranged to hold the country's shape
- export: static
- readAs: the page's own inline `<svg>`, 915 x 1120, photographed whole. Both routes reached the
  encoding itself: the style route counted its marks and read the type inside the hexes.

## What it is

The 650 UK parliamentary constituencies, one hexagon each, laid out so that the assembled hexes
still read as Great Britain and Northern Ireland. Each hex is filled by the region it belongs to and
carries a three-letter code in very small type. Northern Ireland sits as a separate cluster to the
north-west, in the sea, where the real island is not.

## What it does with information

**One unit, one hexagon, and every hexagon the same size.** That is the whole trade: the map gives
up area — a rural constituency the size of a county and an urban one the size of a suburb are the
same cell — and buys the thing a choropleth of the same data cannot give, which is that **every unit
is equally visible**. On a form whose subject is seats, one seat one cell is the honest geometry.

**Six neighbours, all of them edge-sharing.** A square grid touches diagonally, so a reader has to
decide whether corner contact counts; a hex grid has no corners to argue about. Measured on the
drawing: the rows are offset by half a cell and every adjacency is a shared edge.

**The hexes are separated by their own stroke, not by a gap.** The style route counts **652 marks
with a white stroke** — one per hex plus the frame — so the grid reads as a tiled surface rather than
as scattered marks, and the white is the page's own ground doing the separating.

**Identity is inside the mark**, in `Helvetica Neue 6.4 / 400` — six and a half pixels, which is
smaller than any register this base files. At 650 cells it is not meant to be read at rest; it is
meant to be there when the reader looks for one.

**The layout is drawn, not derived.** Northern Ireland is placed where it fits, not where it is. The
page says so in its own way — it offers the layout as a downloadable file to be edited by hand.

## What it does with style

Ground `#EFEFEF` at 57 %, palette read as **categorical**: `#67E767`, `#1DD3A7`, `#D73058`,
`#E6007C`, `#2254F4`, `#FF6700` — one hue per region, twelve in all, at 59-84 hexes each. The page's
own type is Poppins for headings and Arial for controls; the hex codes are Helvetica Neue at 6.4.

## What is transferable

- **One unit, one cell, all cells equal** — when the subject is the units and not their extent.
- **Prefer the hexagon when adjacency matters**: six edge-sharing neighbours, no diagonal ambiguity.
- **Separate the cells with a stroke in the ground's colour**, so the grid is a surface rather than
  a scatter.
- **Put the unit's code inside its own cell**, even at a size nobody reads at rest.

## What is this piece's own

The twelve regional hues; the editable layout file; the Northern Ireland cluster's position.

## What was not verified

- **Whether the piece argues for the hexagon over the square anywhere in its prose** — only the map
  was read. The geometric claims above are read off the drawing.
- **One publication.** The sibling record `open-innovations-org-blog-2017-06-09-election-hex-map` is
  the same publisher, and the two count as one for the evidence floor.
