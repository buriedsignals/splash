# Statista — "President's Party up Against Poor Odds in the Midterms"

- url: https://www.statista.com/chart/15723/the-neat-seat-loss-gain-by-the-presidents-party-in-the-midterm-elections/
- archive: search (found by reading the titles in Statista's own `chartoftheday` index for the words
  the form uses — "net seat loss/gain"; not a line of the url list)
- readAs: the Chart-of-the-Day page at 1440×900, **after the harvester clicked
  `#onetrust-accept-btn-handler`** (recorded in `record.consent`). `style.graphic.tag` is **`img`**
  756 × 1009 at `documentTop: 1135`; `routes.pixel.measuredFrom: "graphic.png"`.
  `style.typeSource` is **"the page only — the graphic is a raster and carries no type this route
  can read"**, so the Open Sans reported in `style.type` is statista.com's own page furniture and
  **not the poster's voice**. Every type observation below is a human reading of the raster.

## What it is

Net seats gained or lost by the sitting president's party at every U.S. midterm since 1962 — sixteen
rows, drawn twice: **House Seats** in one diverging panel, **Senate Seats** in a second, side by
side, sharing one row index and one legend.

## What it does with information

**Two hues, assigned by SIGN, with an explicit legend.** `Loss` and `Gain` are named as swatches
above the panels — the only reference in this family that legends its signs rather than leaving them
to the labels. Orange carries the losses: `#FF7D3B` 1.018 %, `#FE732C` 0.944 %, `#FF8243` 0.513 %,
`#FE7935` 0.504 %, `#FE7732` 0.503 % (one fill and its antialiasing). The `Gain` teal is **looked at,
not measured** — the gains are so few and so short that no green appears in the record's top ten
chromatic entries at all. That absence is itself the finding the chart is about.

**Every value label is signed, in ink, outside the growing tip.** `−63`, `−4`, `+5`, `+8`, `+3`. The
plus is written, not implied. The label never sits on a fill and never takes the fill's colour.

**A zero is a label with no bar.** Clinton's 1998 Senate row reads `0`, flush against the axis, and
draws nothing. The row is not dropped and the number is not omitted.

**A third colour system, orthogonal to the sign.** The president's name is set in the party's
colour — `#0C3D81` at 0.164 % for Democrats, `#CF0203` at 0.218 % for Republicans — and the year sits
to its left in a grey pill. So each row carries WHO, WHEN, and HOW MUCH IN WHICH DIRECTION in three
independent encodings, and none of the three is doing another's job. (Compare Datawrapper's
`xFO0J`, where the row-label colour repeats the bar's sign rather than adding a fact.)

**Chronological order, not sorted by value.** 1962 at the top to 2022 at the bottom, with alternating
row banding across the full width of both panels. The same decision as `xFO0J`: when the category is
a date, the date orders the rows.

**Two panels, two zeros, ONE length scale — measured.** Bar extents read off `graphic.png`: in the
House panel the zero is at x = 492 and `−63`, `−52`, `−47`, `−13` run 157, 129, 116 and 31 px, i.e.
2.49 / 2.48 / 2.47 / 2.38 px per seat. In the Senate panel the zero is at x = 661 and `−9`, `−8`,
`−6`, `−4` run 21, 18, 13 and 8 px, i.e. 2.33 / 2.25 / 2.17 / 2.00 px per seat — the same scale
within the rounding error of an 8 px bar. **The panels differ in WIDTH, not in scale**: the House
box is about 263 px wide and the Senate box about 163 px. So a seat is a seat wherever it is drawn,
and the Senate panel is simply given less room because it needs less. That is the expensive answer —
it leaves the Senate column visually slight — and it is the one that keeps the two panels
comparable.

## What it does with style

Ground `#F5F9FC` at 56.582 % — a pale blue-grey, **not white**; palette read as **diverging**. Behind
it `#ECF1F7` at 21.717 % is the panels' own inner ground, so the plate is two tones of near-white
before any ink lands. Ink `#0F2741` 1.310 % and `#122A44` 0.614 % (a dark navy, not black). Rules and
row banding `#9DB3BB` 1.708 %, `#CBD5DC` 0.327 %, `#DCE4EB` 0.316 %.

Looked at (raster, so no type route reaches it): a heavy condensed sans headline over a lighter grey
deck, an orange rule down the left of the title block that picks up the `Loss` hue, panel headings in
small caps-weight bold, a source line, a CC-BY-ND badge row, and the statista wordmark bottom right.

**The headline is an argument, and the deck is the measure.** "President's Party up Against Poor
Odds in the Midterms" / "Net seat loss/gain by the president's party in the U.S. midterm elections
since 1962".

## What is transferable

- **Legend the two signs by name** (`Loss` / `Gain`) when one of them is rare — the reader may never
  see enough of the second hue to learn it from the bars.
- **Write the plus.** `+5` and `−5` read as opposites; `5` and `−5` read as a number and an error.
- **A zero row keeps its label and draws no bar.**
- **Two diverging panels sharing one row index** let a second measure ride along without a second
  chart. Keep ONE length scale across both and vary the panel WIDTH instead: it costs the smaller
  panel its presence and it is the only arrangement in which a bar in one panel means the same thing
  as a bar in the other.
- **A row-label colour can carry an attribute the bars do not encode** rather than repeating the sign.
- **A near-white tinted ground** (`#F5F9FC`) with a second, slightly different panel ground
  (`#ECF1F7`) separates the plot from the plate without a border.

## What was not verified

The seat counts were not checked against The American Presidency Project. The px-per-seat figures
above are read off the raster by thresholding the orange fill, so they carry the antialiasing of a
bar edge — about ±1 px, which is ±12 % on the shortest Senate bar and ±0.6 % on the longest House
one; the claim that the two panels share a scale rests on the long bars, not the short ones. The `Gain` hue was read by
eye only; it is below the pixel route's reporting threshold, so no hex for it is quoted. Statista's
poster is a raster, so **nothing about its typefaces or type sizes is measured** — the page's own
Open Sans belongs to statista.com and is not the poster's. The page was read only after a OneTrust
consent dialog was dismissed by the harvester, which is a state the harvester put the page in.
One publication.
