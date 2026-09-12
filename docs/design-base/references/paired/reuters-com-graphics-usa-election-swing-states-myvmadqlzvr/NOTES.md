# Reuters Graphics — "Behind the Battleground States"

- url: https://www.reuters.com/graphics/USA-ELECTION/SWING-STATES/myvmadqlzvr/
- archive: url-list
- type: several paired forms in one piece — offset tint pairs with a SHAPE legend, a slope-topped
  column chart, and a 51-tile small-multiple with the subject set picked out
- export: interactive scrollytelling
- readAs: the live page, walked to its lower half — NOT the state the harvester photographed
  (`screenshot.png` is the title card, and its pixel figures describe a mascot illustration).
  `graphic-scrolled.png` and `graphic-legend.png` in this directory are what was read; the pixel
  figures below were measured on `graphic-scrolled.png`.

## What it is

Sarah Slobin and Howard Schneider on "what's changed in the seven states likely to determine
America's next president". Three paired devices matter here.

1. **"Change in educational attainment, 2016 to 2023"** — for each of the seven states, five
   categories (`<High School`, `High School`, `Some college`, `Bachelor's`, `Graduate`), each drawn
   as a **pair of rectangles**: a plain bar for 2016 and a grid-ruled bar for 2023, in a light and a
   dark tint of one purple, offset vertically so the offset's direction is the sign of the change.
2. **"Change in voting age population, 2016 to 2023"** — one column per state, whose **top edge
   slopes** from the 2016 value to the 2023 value, whose **width** encodes new voters, and whose fill
   is the 2020 winner's party colour.
3. **"The Last Five Elections"** — all 51 jurisdictions as a cartogram of small step charts; the
   seven battlegrounds at full ink inside a purple box with their code, the other 44 in the same
   geometry faded almost to the paper.

## What it does with information

**The pair is a light/dark tint of ONE hue, and the tint is documented.** The 2016 fill is
`#C1B6DB`, the 2023 fill `#6A51A3`, read directly off the pixels of the Pennsylvania cluster (light
first, left to right). The pixel route classifies `#6A51A3` as **chromatic** and `#C1B6DB` as
**neutral furniture at 6.0 %** — the earlier state has literally receded out of the palette and into
the furniture, and the route says so without being asked.

**The legend teaches the GEOMETRY, not the colours.** It carries two labelled circles (`2016`,
`2023`) and then three miniature pairs labelled **LOSS**, **FLAT**, **GAIN**, each showing the
vertical offset that means it. A reader is taught to read the shape, which is the part of this
encoding they could not have guessed.

**A category with no change is drawn in NEUTRAL and carries its two numbers.** Pennsylvania's `Some
college` pair is grey with `24% 24%` printed between the two bars. The one case where the geometry
says nothing is the one case that gets its numbers — the picture spends ink exactly where the shape
runs out.

**The slope-topped column puts the pair in one silhouette.** Two values become the two ends of a
roofline, and a third variable (population added) becomes the column's width, so one mark carries
before, after and size. Two chips, `2016 ▾` and `2023 ▾`, sit above the roofline and say which end is
which.

**The subject set keeps full ink; the population keeps the geometry.** In the 51-tile cartogram the
44 non-battlegrounds are drawn identically and faded, not omitted and not summarised. That is
`context-in-neutral-at-the-subject-scale` done by opacity, with the subject additionally ringed and
labelled — an emphasis that costs the encoding no channel. The same ringing appears earlier on the
piece's electoral-vote rail, where the seven states are outlined in purple while keeping their
party's red or blue fill.

**The scale legend is a specimen tile.** Rather than repeat ticks on 51 panels, one miniature panel
is drawn at the top-left with `80%▸` and `20%▸`. The key is an instance of the mark.

**Value labels stagger rather than rotate or drop.** Under the population columns, `267,000`,
`192,000`, `190,000`, `167,000` alternate onto two baselines where they would have collided.

## What it does with style

Measured on `graphic-scrolled.png`: ground `#FFFFFF` at **78.2 %**; palette **categorical, three hue
clusters** at 210° (`#08519C`, 5.9 %), 258° (`#6A51A3`, 3.1 %) and 358° (`#A50F15`, 1.8 %); neutral
furniture `#C1B6DB` at **6.0 %** — the 2016 tint — plus `#CCCCCC` at 0.6 %.

**The record's own pixel figures are the title card and must not be used**: `routes.pixel.measuredFrom`
is `screenshot.png`, the largest `<svg>` found was 126 × 40, and the reported chromatic colours
(`#54278F` at 0.11 %, `#D64000` at 0.01 %) are the piece's purple mascot and a nav accent.

Style route, three families: **Source Sans Pro** for everything in the graphics — 14 / 700 (116
runs, values), 12 / 700 (104 runs, state codes), 14 / 400 (77 runs, state names), 14 / 300 (13 runs,
axis percentages), 24 / 300 (11 runs, chart titles: "Battleground States, 2020"); **FreightText**
21 / 400 for the article's prose; **Knowledge** 16 / 500 for the site nav. **Zero italic runs, one
tracked run, one case-transformed run** — the state names are typed in capitals rather than
transformed. Text column 660 px / **63 ch**.

Note the chart titles are set at 24 px in weight **300** — lighter than the body text under them.
The graphic's own heading is the quietest type on the page, and the marks are the loudest thing.

## What is transferable

- **Draw the pair as two tints of one hue and let the earlier one fall into the furniture.**
- **When the geometry carries the meaning, make the legend a set of specimen marks** labelled with
  what each shape means (`LOSS` / `FLAT` / `GAIN`), not a colour key.
- **Draw the no-change case in neutral and give it its numbers.**
- **Put the pair in one silhouette** — a column whose top edge slopes from before to after — when a
  third variable also needs a channel.
- **Fade the population rather than dropping it**, and mark the subject with a ring and a label so
  emphasis costs no encoding channel.
- **Stagger colliding value labels onto a second baseline** rather than rotating or dropping them.

## What is this piece's own

The Reuters purple/red/blue; the candidate photographs used as a key; the cartogram layout of the US.

## What was not verified

What the plain bar and the grid-ruled bar in each pair distinguish — the legend labels them only
`2016` and `2023`, and whether the grid rules encode a count or are texture could not be read.
Whether the seven state clusters share one vertical scale. The percentages printed in the grey pairs
were not checked against any source. The piece's own interactivity was not exercised.
