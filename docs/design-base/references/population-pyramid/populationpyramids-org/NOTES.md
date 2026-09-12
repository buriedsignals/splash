# PopulationPyramids.org — *World Population Pyramid — 2025*

`https://www.populationpyramids.org/` · harvested 2026-09-08 · archive `search`.

## What it is

An interactive demographics site — *"Interactive Demographics for 195 Countries"* — whose home page
is one pyramid. The record's graphic is a **`canvas`** 1104 × 500 at `documentTop` 735,
`nearTheTop: true`, `routes.pixel.measuredFrom: "graphic.png"`, `entry: null`.

**It is the second record in this family whose picture is covered by an unhandled consent overlay,
and the two are unrelated sites.** A French dialog — headed *Utilisation de Cookies et de Données
Personnelles*, buttons *Refuser tout* / *Paramètres* / *Tout accepter* — sits across roughly the
middle 70 % of the plate. `record.consent` is `null`: the dismisser did not fire and does not know it
failed. Both routes reported `ok`.

The record is kept for what is legible around the panel — the title, the legend, both axes, the axis
title and the bottom two bands — and because two independent consent failures in one family is the
single most useful thing this harvest measured about the harvester. **No colour in this record may be
quoted.**

## The palette is contaminated

| what the record reports | what it actually is |
| --- | --- |
| ground `#FFFFFF` at 49.547 % | mostly the modal's own white panel |
| `#4CAF50` at 1.256 % (hue 122) | the green **Tout accepter** button |
| `#7A96C5` at 0.524 % (hue 217) | the male bars' blue, through the panel's wash |
| `#C17F9F` at 0.520 % (hue 331) | the female bars' pink, through the same wash |

A chart whose single largest chromatic entry is a consent button's green is not a measurement of a
chart. `record.style.marks` is no help either: the graphic is a `<canvas>`, so the style route reads
no marks from it at all — the six entries it does carry
(`fill oklch(0.546 0.245 262.881)`, `stroke oklch(0.373 0.034 259.733)`, …) are the site's own
buttons and rules.

## What it does with information

Everything below is read from the parts of `graphic.png` the panel does not cover.

- **Both halves count outward from a shared zero and both read as positive**:
  `394.6M 200.0M 100.0M 0.0M 100.0M 200.0M 300.0M 394.6M`, drawn once along the foot, with the axis
  title `Population (Millions)` beneath it.
- **The outermost tick on each side is the data's own maximum, not a round number** — `394.6M`, twice.
  The domain is stated rather than rounded away, so the reader can see how much of the axis the
  longest band actually uses.
- **The age bands are named by both edges** — `0-4`, `5-9`, … `95-99` — with an open top band as an
  inequality, `100+`. Twenty-one five-year bands.
- **The band names sit in the LEFT margin**, under a rotated axis title `Age Groups`, not in a centre
  gutter.
- **The two groups are keyed by a swatch legend above the plate** — a blue square `Male`, a pink
  square `Female`. This is the only record in the family that uses a legend rather than naming the
  halves in words at or inside their own half, and it is also the one where a reader has nothing but
  colour to go on if the legend is missed.
- The plate is titled in place: `World Population Pyramid - 2025`.
- Faint vertical gridlines run behind the bands at each labelled tick.
- The site's own furniture (read from the style route, not the plate) shows what the page is for:
  `"Types of Population Structur…"`, `"Expansive (Triangle):"`, `"Year: 2025"`, `"🔄 Reset"`, a list
  of 195 flags. It is a teaching tool with a country picker and a year slider.

## What it does with style

**Nothing may be quoted.** See above. The only style fact this record establishes honestly is
negative: the plate is a `<canvas>`, so **neither route can read its type or its marks**. The style
route's `typeSource` is `"the page, which contains the graphic — the two are not separated"`, and
what it reports — `__Inter_f367f3` at 12/14/16/18/24 in oklch inks — is the site's React furniture.
Attributing any of it to the chart would be inventing a measurement.

## What is transferable

- **Label the outer tick with the data's own maximum**, on both sides, so the axis states its domain
  instead of rounding it away. `394.6M` at both extremes; nothing else in this family does this.
- **Bands named by both edges with an open top band as an inequality** (`100+`) — a third
  publication for a convention ONS and PopulationPyramid.net also keep.
- **A counter-example worth keeping**: this is the family's only swatch legend, and it is the family's
  only plate where the mirrored halves carry no other identification. Four of the six publications
  here name the halves in words instead. The legend is not wrong; it is the weaker of two available
  choices, and the corpus shows which one desks reach for.

## What was not verified

- **Every colour.** Unhandled consent overlay; see above.
- **Everything the panel covers** — the middle of both silhouettes, the bands from about `10-14` up
  to `80-84`, and whatever value labelling the plate may carry inside that region.
- **The plate's type and marks.** `<canvas>`; unreadable by either route, at any time, overlay or no.
- **The legend swatches' actual colours.** The legend sits above the panel and is visible — a blue
  square and a pink one — but nothing in the record measures them: the pixel route's reading is
  contaminated and the style route reads no marks from a `<canvas>`. That the pair is
  blue-and-pink is a description of the picture, not a measurement, and no hex is quoted for it.
- **The interactive states.** A year slider and 195 countries; the harvester does not click.
