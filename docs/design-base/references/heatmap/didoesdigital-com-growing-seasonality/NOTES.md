# Di Macdonald — "Can I Eat It Yet? A visual guide to seasonal fruit and veg"

- url: https://didoesdigital.com/growing/seasonality/
- archive: url-list
- type: matrix in polar coordinates, produce × month, binary cells
- export: web
- readAs: the piece's own SVG photographed as the element (`graphic.png`, 1912 × 1912), plus the
  page's controls and chip list around it

## What it is

A personal data project — not a newsroom piece — answering what fruit and vegetables are in season
in an Australian state this month. Two matrices: a month view, where the rings are produce and a
90° wedge shows one month, and an **Annual seasonality** ring where the rings are produce and the
full 360° is the twelve months, `Jan` at the top. A cell is on or off: in season or not.

## What it does with information

**The cell's colour is the subject's own colour, and the legend is the produce list.** Each ring is
filled in the colour group its produce belongs to — the chip list below is headed `GREEN`, `PURPLE`,
`YELLOW`, `BROWN`, `WHITE`, `RED`, `ORANGE`, with every chip filled in its group's colour. Measured
mark fills: `rgb(36, 188, 140)` at 372 runs, `rgb(237, 151, 152)` at 228, `rgb(249, 232, 157)` at
132. The reader who knows a lettuce is green already holds the key.

**The out-of-season state is drawn twice**: the ring is unfilled, and the chip in the list is
**struck through** — `Zucchini`, `Capsicums`, `Strawberries` — with a sentence saying so in words:
`Foods that are out of season in September are crossed out e.g. Apples`. A binary matrix that also
prints its own convention.

**The reader's own selection is the parameter.** `14 out of 20 favourite foods are selected` — the
matrix draws the reader's list, not a national one, and a `Hide out of season foods` checkbox
removes the negative space entirely for a reader who wants only the answer.

**The label sits on the ring it belongs to**, horizontally through the centre of the wedge, so no
row leader lines are needed.

## What it does with style

Pixel route on the graphic itself: ground `#FAF9FB` at **82.4 %** — a very slightly cool near-white
— against a **categorical** palette of `#24BC8C` green, `#8FDAC3` and `#84DCC0` pale greens,
`#ED9798` pink-red, `#F5D6A3` and `#F9E89D` yellows. Each colour group is drawn at two lightnesses,
one for the wedge fill and one lighter for the ring band, so a ring reads as a band even where no
produce is in season.

Type: `Quicksand` throughout — 24 / 700 for the display, 24 / 400 for the month names, 16 / 400 for
the produce labels, and **16 / 400 with tracking 1.6 in uppercase** for the colour-group headings
(`green`, `fresh` at 900 weight). Tracked capitals as a register of their own, and a 900 weight —
neither of which this repository has ever used.

## What is transferable

- **Where the subject carries a colour a reader already holds, use it as the encoding.** The key
  becomes the reader's own knowledge.
- **Draw the negative state twice** — absent in the graphic, struck through in the list — and print
  the convention in a sentence.
- **Two lightnesses per category**, one for the mark and a paler one for its track, so the row stays
  legible where it is empty.
- **Put the row label on the row's own band**, through the centre, rather than in a left gutter.

## What is this piece's own

`Quicksand`, the Australian produce data, and the polar layout, which here costs the month-to-month
comparison the same way it does in "Colours In Culture".

## What is NOT a newsroom practice, and matters for the evidence floor

This is one person's side project, not a desk. It is filed because it teaches, and it is cited in
the proposal for what it teaches, but a reader weighing whether two publications independently do a
thing should know that this publication is one designer with no editor.

## What was not verified

- Any state other than `September` / the default state selection. The month arrows and the six state
  radio buttons were not exercised.
- The `Hide out of season foods` view.
- Whether the ring order encodes anything (it appears to group by colour, but nothing was measured).
- Contrast of the pale yellow rings against the near-white ground.
