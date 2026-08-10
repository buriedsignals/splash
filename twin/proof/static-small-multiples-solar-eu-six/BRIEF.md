---
size: landscape
type: small-multiples
---

# Beat — solar's rise in the EU's six largest countries, panel by panel

**Type:** small multiples (six line panels). **Medium/genre:** chart / static. **Channel:**
article web, 900 x 620 (taller than the 560 default — two rows of panels plus a shared x-axis
band do not fit the default frame without squeezing the panels below a readable height).

## Claim

Solar supplied under 3% of electricity in every one of the EU's six largest countries in 2010 —
2.41% in Spain, the highest of them, and exactly zero in Poland and Romania. By 2024 it supplied
more than a tenth in four of them (Spain 20.7%, Germany 14.9%, Italy 13.5%, Poland 10.3%), while
France is at 4.4%.

Computed in `render.mjs` from `data.csv`, printed to the console before the render, and used to
build every string the chart carries:

- **"under 3%"** is `Math.ceil` of the highest 2010 reading across the six (2.41%), not a round
  number chosen because it sounded safe.
- **"more than a tenth in four of them"** is a count of the panels whose 2024 reading exceeds 10.
  The word "four" is indexed out of a spelled-number table from that count; if the data moved, the
  word would move with it.
- **"rises furthest"** in the alt text is a separate computation from the panel order. Highest
  today and risen most are different questions — here both answer Spain (+18.33 pp), but the alt
  text asks the question it actually makes a claim about rather than inheriting the answer from
  the sort.
- **"exactly zero"** is `=== 0` against the frozen readings, and the render throws before drawing
  if any panel's 2024 reading is not above its 2010 one, because the headline says every one rose.

## Which six, and why that rule matters here

The six largest member states of the European Union **by population** — Germany, France, Italy,
Spain, Poland, Romania. The rule is external to this dataset, verifiable, and it was fixed before
any solar figure was read.

That matters more for this type than for most. A small-multiples grid is an argument about which
panels were shown as much as about what is in them; a set assembled after looking at the numbers
would be a shortlist wearing a grid's clothes. It is also the reason **France** is here at all —
its panel is nearly flat, and nothing in the selection rule allowed a dull panel to be dropped.
The flatness is the finding.

## The shared scale, which is the whole type

`references/types/small-multiples.md` names one non-negotiable and one trap, and both drive the
component:

**One shared y domain and one shared x domain, on every panel** — same domain, same size, same
aspect, same axis position — "even if that means some panels look nearly flat and others look
dramatic, because that flatness or drama IS the finding". Letting each panel fit its own range
would have drawn France's 0.1→4.4 climb at the same visual amplitude as Spain's 2.4→20.7, and a
reader would walk away with exactly the wrong impression, confidently. `gridGeometry` builds one
pair of scales from all panels' readings and hands the same domain to every box; the component
throws if the panels do not cover identical years, because a shared axis is not optional here.

**The repetition trap.** The unit, the axis title and the source appear once, at the level of the
whole grid. y tick labels are drawn only down the left column, x tick labels only along the bottom
row, and each panel carries nothing but its own country name and its own end value. Printing the
axis six times is not reinforcement, it is the same decoding work repeated six times.

Panel order is by the 2024 share, descending — a meaningful order, never alphabetical by default.

## Axes

The y axis runs from **zero**. This is a share of a whole whose interesting floor is genuinely
zero (two of the six were at zero in 2010), so a fitted floor would have nothing to fit to. Ticks
are the round values `.ticks(4)` returns on the `.nice()`d shared domain, and the unit sits on the
**topmost tick only**, once, per `static-discipline.md` — not on all five gridlines of all six
panels.

The x tick labels are chosen by **measuring** them, not by taking every other one:
`labelledXTicks` keeps both ends (the claim names both years), then walks the interior candidates
left to right and drops any that would sit closer than half of the two labels' own widths plus a
gap — either to the last one kept or to the final one. On this panel width that yields 2010, 2014,
2018, 2024: 2022 is dropped because it would crowd 2024, and it is dropped by measurement rather
than by a rule about which ticks look nice.

## Colours

`PALETTE.md`, `origin: subject` — the renewables convention, taken over the house accent because
`matchConvention` fires on exactly one convention for this subject and returns it unambiguously.
Green reads as renewable generation before a legend is read. Measured 5.06:1 against this ground,
well clear of the 3:1 non-text floor.

The line carries the accent; every number and every word is ink or muted, from `deriveFurniture`.
An accent that clears the 3:1 floor as a stroke can still miss the 4.5:1 floor as a printed
number, which is why the end labels are not drawn in it. `render.mjs` names no hex.

## Source

Ember, via Our World in Data · `electricity-mix.csv?csvType=full&metric=share_of_generation&
source=solar`, frozen as `data.csv` filtered locally to the six countries, 2010-2024 (90 rows) ·
extracted 9 August 2026.

The **full** CSV was taken and filtered here rather than fetched with `country=`, because on this
endpoint that parameter is not honoured: the same fetch with a twelve-country `country=` list
returned all 190-odd entities with HTTP 200, and adding `csvType=filtered` returned every entity
for a single year instead of a time series. That is the trap
`twin-intake/references/ourworldindata-csv-filter-trap.md` documents, met twice while preparing
this beat. `render.mjs` re-verifies the frozen file's distinct `Entity` values against the six it
expects and throws on anything else, so the freeze cannot silently drift into the whole world.

2025 readings exist in the source and were **excluded**: the same endpoint's "latest" view maps
2025 to an original year of 2024 for many countries, which is the shape of a partial year, and a
partial year at the end of a rising series would read as a slowdown that has not happened.

## What went wrong, caught by looking

Two things, both found in the rendered PNG rather than by any check:

1. **Every gridline carried the unit** — `0.0%`, `5.0%`, `10.0%` … down all six panels, thirty
   labels for one fact. Corrected to round numbers with the unit on the top tick only, which is
   what `static-discipline.md` already asked for and what the type sheet's repetition trap is
   about.
2. **The widest end label finished three pixels short of the frame's padding.** Measured-correct —
   the reserved gutter is `measureText` of the widest label that will really be drawn — and still
   reading as a number about to fall off the page. The reserve gained the clearance rather than
   the label gaining a smaller font.

## Size — 2026-08-11

**Pinned: landscape (1920 x 1080)**, in the front matter, read by `readPinnedSize` and verified from
the delivered PNG's own IHDR. It shipped 1800 x 1240 before, a frame stated twice as literals that
agreed with each other.

**The packing is asked of the frame, not written down.** `COLUMNS = 3` is gone; `columnsFor(width,
height, panels)` picks the grid whose panel box lands nearest the 1.6:1 shape these six panels were
drawn and accepted at — 3 x 2 on a wide frame, 2 x 3 on a tall one. That is the spec's own
instruction for this beat: the size table must not learn how many columns a six-panel grid takes, or
it stops being a table.

**Square and portrait are refused by `type-at-size.mjs`.** The panels are line charts, and a line's
argument is a slope; no aspect range has been measured for a small-multiples grid at a tall frame,
so the toolchain refuses rather than choosing one. `columnsFor` is written and tested for the tall
case anyway, so the day a probe measures the range there is nothing else to build.

**One defect the bigger type exposed:** the credit was drawn as a single unwrapped line. At a 2.2x
scale it measures past the frame's right margin — an unwrapped constant is exactly what clips a
credit in silence. It wraps on the real frame width now and its LAST line lands on the bottom of
the band. The two tick hints are COUNTS and are deliberately outside the scaling helper: multiplied
by 2.2 they would have asked for nine gridlines and thirteen year labels in each of six panels.
