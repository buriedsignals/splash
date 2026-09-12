# The New York Times — *The Ebb and Flow of Movies: Box Office Receipts 1986 — 2008*

- url: https://archive.nytimes.com/screenshots/www.nytimes.com/interactive/2008/02/23/movies/20080223_REVENUE_GRAPHIC.jpg
- archive: url-list
- type: streamgraph — the piece that named the form
- export: static (a photograph of a dead interactive)
- readAs: one horizontal window of the live piece, as the publisher's own archiver saw it in 2018
- credit on the plate: Mathew Bloch, Lee Byron, Shan Carter and Amanda Cox; sources Baseline
  StudioSystems and Box Office Mojo; published 23 February 2008.

## What it is

Weekly box-office revenue for ~7 500 films over 21 years, each film a lens-shaped band in a
baseline-free stack. This is the piece streamgraphs are named after.

**Why this url, and what was actually read.** The interactive itself is Flash. `archive.nytimes.com`
serves the original page and its own capsule metadata says so out loud —
`"hasFlash": true, "severeMixed": true` — so harvesting the html reaches a dead plugin box, not a
chart. The same archive publishes the screenshot it took of the page while it still ran, and that
is what this record is: **the publisher's own photograph of its own live piece**, 1024 × 1088. It is
not a promo card, not an `og:image` and not a mockup — the three things `METHOD.md` step 3 forbids
building a lesson on. It is, however, a picture of a whole web page, and the consequences of that
are stated under style below.

`routes.style` is `not-applicable`: the url is a bare JPEG served as its own document and carries no
text nodes. The harvester reported `ok` on an empty type list; that was corrected by hand on
2026-09-08 so the record does not claim a reading it does not have. Everything said below about
type is **read off the image**, not computed.

## What it does with information

**Four separate quantities are carried by four different geometric properties, and a key says which
is which.** Verbatim from the plate: *"Each shape shows how one film did at the box office."* —
*"Height shows weekly box office revenue"* — *"Width shows longevity"* — *"The area of the shape
(and its color) corresponds to the film's total domestic gross, through Feb. 21."* With no axis
anywhere on the drawing, that block of prose is the entire legend, and it defines height, width,
area and colour in four short lines.

**Colour is a sequential ramp on a SECOND quantity, not an identity palette.** The key runs
`$862 million → 250 → 100 → 25 → 1`, pale gold at the bottom to dark red at the top. Every band's
hue therefore answers "how big was this film overall", while its thickness answers "how big was it
this week". That is the trick that makes a stack of thousands of bands readable at all: the eye
groups by tone before it separates by outline.

**In-band labels, each with a leader dot, and only for the films that earned one.** `• Transformers`,
`• Ratatouille`, `• I Am Legend`, `• National Treasure: Book of Secrets` — set in a small serif
directly on the fill, at the film's own peak, with a bullet marking exactly which band the name
belongs to. Most bands carry no label at all. The chart is honest about this: naming every one of
7 500 films is impossible, so it names the ones a reader is looking for and leaves the rest as
texture.

**There is no y-axis and no gridline.** The only scaffolding is a row of month names across the top
(`June … Feb.`) with the year set larger and greyer beneath the January boundary (`2007` / `2008`).
Time is labelled; value never is.

**The window scrolls; the chart does not fit.** A horizontal scrollbar under the plate shows the
visible slice to be roughly a twentieth of the whole span. The piece chose a fixed vertical scale
and a pannable time axis over squeezing 21 years into 900 px — the opposite trade to every
reference in this family that fits its whole span on one plate.

**A `Find Movie` box sits above the graphic.** The way back from an impression to a specific fact is
search, not a legend.

## What it does with style

Measured on this record's own `graphic.png` (`routes.pixel.measuredFrom = "graphic.png"`), palette
shape reported as `diverging`:

| role | value | coverage |
| --- | --- | ---: |
| ground | `#FFFFFF` | 65.27 % |
| ramp, middle | `#BB7B62` | 3.22 % |
| ramp, low | `#F5BE63` | 1.99 % |
| ramp, high | `#BB5137` | 0.98 % |
| ramp, lowest | `#FCDCAB` | 0.27 % |

**And this plate is the whole archived PAGE, not the chart alone.** The masthead, the section nav,
the footer link list and a third-party "URL Shortener" advertisement are all inside the photograph.
Two consequences, both real: the ground share is diluted by page chrome, and `#418CD5` at 0.23 % is
**the advertisement's blue**, not the chart's — the piece's own drawing contains no blue at all. The
grey block `#EDF1F2` 3.34 % / `#E3E3E3` 1.69 % / `#CCCCCC` 0.88 % is nav and rules. This is the
same class of contamination `METHOD.md` corrections 13 and 15 were written about; it is stated here
rather than left for the arithmetic guard, because on a single record the arithmetic guard cannot
see it. The four ramp entries above ARE the chart, and they are quoted as such because the ramp is
the only warm family on the page.

Typography is read off the image and not measured: the headline is the Times' own serif at display
size, the dek a smaller serif; the in-band film names are a small serif on the fill; the legend and
the month row are a small grey sans/serif mix. No tuple from `style.type` exists for this record and
none is invented.

## What is transferable

- **When the drawing has no axis, spend a legend on what each geometric property means.** Height,
  width, area, colour — four sentences, four properties. Most charts can assume; this form cannot.
- **Let colour carry a second quantity as a sequential ramp** rather than repeating identity that
  the band's position already gives. It is what makes a very high series count survivable.
- **Label a few bands, at their own peak, with a leader dot**, and accept that the rest are texture.
- **Give the reader a search box** as the route from impression back to a named thing.
- **A fixed vertical scale with a pannable time axis** is a legitimate answer to "the span does not
  fit"; squeezing is not the only option.

## What is this piece's own

The 2008 Times page furniture, and the willingness to publish a chart with thousands of unlabelled
bands — a scale of ambition tied to that newsroom and that moment.

## What was not verified

- **Nothing was seen live.** The interactive is Flash and does not run; every reading above comes
  from one static frame of it. Hover states, the search behaviour, the panning and whatever the
  piece did on selection are all unread.
- **The rest of the timeline.** The frame shows roughly June 2007 to February 2008 out of 1986–2008.
  Claims about "the whole piece" are claims about this window.
- **The exact ramp stops.** The five key swatches were not sampled individually; the four hexes
  above are the plate's most-covered warm colours, which is not the same thing.
- **Whether the in-band label ink was contrast-checked.** The film names are dark on pale-to-mid
  fills in this window; a dark band with a dark name would fail, and this frame does not show one.
- **Independence from `leebyron-com-streamgraph`.** Lee Byron is an author of both. For the purpose
  of counting publications these two records are **one voice**, and they are not used as two.
