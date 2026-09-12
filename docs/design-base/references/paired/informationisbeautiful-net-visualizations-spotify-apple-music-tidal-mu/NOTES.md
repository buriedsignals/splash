# Information is Beautiful — "Money Too Tight to Mention?" (streaming royalties compared)

- url: https://informationisbeautiful.net/visualizations/spotify-apple-music-tidal-music-streaming-services-royalty-rates-compared/
- archive: informationisbeautiful
- type: slope between two DIFFERENT variables, plus a table of per-column glyphs
- export: static poster
- readAs: the published poster as the page serves it, read at rest, from the page screenshot; the
  pixel route measured the page, not the poster (see below)

## What it is

Ten streaming services. On the left, a dotted vertical rail carrying **average artist revenue per
play** ($0.0190 down to $0.0007); on the right, a second dotted rail carrying **total users, in
millions** (1,000 down to 4). Between them, one curved connector per service, in that service's own
colour. To the right of the second rail, four further columns — `% free users`, `plays needed to
earn min. wage`, `estimated total annual loss`, `annual loss per user` — each drawn in its own
small glyph on the same row rhythm: a ring, a row of unit dots, a waffle of squares, a single dot.

## What it does with information

**The slope compares two different variables, not two dates.** The pair here is *revenue per play*
against *audience*, and the crossing lines say the trade-off — the services that pay best reach
fewest people — in a form the family usually reserves for before-and-after. It is the same geometry
answering a different question, and the two rails are headed with what they measure rather than when.

**Each rail is labelled with its own units at its own end**, in the service's colour, so the reader
never has to look up which axis a number belongs to.

**Identity is carried by the entity's own wordmark**, not by a text label: `napster`, `TIDAL`,
`Spotify`, `YouTube` are set as their logos down the left edge. Ferdio's `viz57` does the same
thing with national flags. Two publications, two subject domains, one move: **where the entities own
a mark the reader already recognises, the mark replaces the label.**

**The four extra columns each get a glyph suited to their own quantity** — a ring for a percentage,
countable dots for "how many plays", a waffle for a total, a single sized dot for a per-user figure —
and they all sit on the row the service already occupies. The table is a small-multiple of encodings,
not a grid of numbers.

**Missing data is written, in the furniture grey, in the cell**: `no data` appears four times
rather than leaving a blank the reader could read as zero.

**The caveats are printed in the plate**, under a dotted rule: `* based on 5% of standard Pandora
users…`, `** Spotify count every person on a family plan as a separate user`, each tied to the
asterisk that appears beside the number it qualifies.

## What it does with style

A near-black ground; the pixel route reports `#1C1C1C` at **75.5 %** of the page shot, with
`#F9F9F9` at 5.5 % — but that is the page, and the poster's own ground is a slightly different
near-black not separately measured. Saturated categorical hues, one per service, on black.

**The record's chromatic palette is the SITE'S PROMOTIONAL BANNER, not this graphic.** All three
dark-ground Information is Beautiful records harvested for this family report the *identical* four
chromatic colours — `#D4537A` 0.70 %, `#EAAB4A` 0.68 %, `#ECB445` 0.65 %, `#E69B53` 0.63 %, clusters
at 342° and 37° — for three completely different pictures. That is the pink→amber "New! Learn to do
data-viz" bar that sits across the top of every page. These posters are served as rasters with no
`<svg>`, `<canvas>` or `<figure><img>` large enough for `largestGraphic`, so the pixel route fell
back to the whole page screenshot and the banner was the only chromatic thing in it. A close cousin
of `METHOD.md`'s correction 3, and it must not be read as a measurement of the graphic.

The style route reads only the page's own type — IBM Plex Sans 18 / 400 for prose, Quicksand 21 / 600
at −0.52 tracking for the site's headings, **two families, one italic run, nine tracked runs, eight
case-transformed** — and **zero mark colours**, which is the raster problem this corpus already
knows. The poster's own type (a condensed grotesque, small caps for column heads) was read by eye and
not measured.

## What is transferable

- **A slope can pair two variables as well as two dates.** Two rails, each headed by what it
  measures, and one connector per entity: the crossings are the trade-off.
- **Let the entity's own mark be its label** where one exists and the reader carries it.
- **Give each column of a comparison table the glyph its own quantity deserves**, on one shared row
  rhythm.
- **Write `no data` in the cell.** A blank is a value in the reader's head.

## What is this piece's own

The black ground and the saturated per-service hues; the brand wordmarks, which only work for
entities that have them; the curved rather than straight connector.

## What was not verified

The royalty figures, their date, and the "last update: 3rd Mar 2018" claim — this note describes the
encoding. Whether the two rails are on linear scales: the left rail's values span 27× and the right
rail's 250×, and neither rail is ticked, so the connectors' geometry could not be checked against
the printed numbers.
