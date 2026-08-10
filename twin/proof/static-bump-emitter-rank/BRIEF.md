---
size: landscape
type: bump
---

# Beat — India has risen from eighth to third among the world's biggest CO₂ emitters

**Proves:** between 1990 and 2024 India moved from eighth to third in the world ranking of annual
CO₂ emissions from fossil fuels and industry, passing five countries on the way — Germany (1999),
Japan (2006) and Russia (2009), and earlier the United Kingdom (1991) and Ukraine (1992), neither of
which is still in the top ten.

**Medium / genre:** chart / **static**. **Type:** bump (ranking-over-time) — one line per country,
its vertical position its RANK rather than its value, rank 1 at the top.

**Its siblings.** `proof/vidz-bump-emitter-rank/` is the same claim as a video and was written
first; `proof/webz-bump-emitter-rank/` is the same claim on the web. All three read their own frozen
copy of the same file and derive every number in this document. **They are not one beat rendered
three ways** — see "What this genre owes that the others do not" below.

## What this genre owes that the others do not

`references/types/bump.md`: the argument of a bump chart IS the crossings, and "the type's whole
reason to exist is that a reader can follow one line through them." The video gets that for free:
six lines advance on one clock and the reader watches the swaps happen. **A still frame has no such
moment**, so everything the reveal did has to be drawn, at rest, with nothing behind a hover:

1. **Both ends carry a name.** The video labels the six lines at the finish, because the reveal
   already showed where each began; this frame has no reveal, so the 1990 column gets its own label
   column too. That is collision-free BY CONSTRUCTION, not by luck: in any one year the drawn
   countries hold DISTINCT ranks, so no two labels in one column can share a row.
   `assertLabelRowsAreDistinct` proves it on the real ranks at both ends and throws otherwise.
2. **Every crossing that carries the argument is named where it happens** — "passed Germany · 1999",
   "passed Japan · 2006", "passed Russia · 2009", each beside its own ringed mark on India's line.
   The video says who was passed in a sentence at the end, because a viewer has just watched each
   one; a still reader has not.
3. **The captions sit in the corridor the crossing itself opened.** After the subject passes a
   country the two hold ADJACENT ranks, subject one row above, so the strip halfway between them is
   empty at that year by construction — no chip behind the text, no leader line, nothing covered.
   The caption's width is measured and the component throws if one would run past the plot.
4. **The two crossings the frame cannot draw are stated under it.** The United Kingdom and Ukraine
   have since left the top ten, so they have no line here to cross. That is what the sentence below
   the year axis is for, and `render.mjs` REFUSES TO RENDER if every crossing happens to be drawable
   — a sentence that only repeated the captions would be `anti-patterns.md`'s repeated reading.
5. **Nothing that is not the argument is annotated.** China took first place from the United States
   in 2006 and that swap is plainly visible at the top of the frame; it is not ringed and not
   captioned, because a second marked crossing reads as a second subject. It is named in the alt
   text, where it cannot pull a reader's eye.

## Data

- Source: Global Carbon Budget (2025) – with major processing by Our World in Data, indicator
  `annual-co2-emissions-per-country`. Citation string taken from the indicator's own metadata
  endpoint, not written from memory.
- `data.csv` is this beat's OWN frozen copy — byte-identical to the video sibling's
  (`sha1 67b394db148fec62aa5b175dd711fa9250b2dc69`), copied in rather than read across, because a
  beat that reads a file out of another beat's folder is a beat nothing can audit on its own.
- 8,617 data rows, 1990–2024, every entity OWID publishes. Rows with an empty `Code` are
  OWID-assembled regions and a `Code` beginning `OWID_` is an OWID-defined entity; `render.mjs`
  drops both, because a world ranking of countries that included "Asia" would be a ranking of
  nothing. Each of the 35 years carries more than 200 ranked countries — asserted at render time.
- What the figure covers, and does not: fossil fuels and industry. **Land-use change emissions are
  not included** — the indicator's own subtitle, carried into the rendered source line.

## Every rank here is computed, and that is this type's specific trap

`references/types/bump.md`: rank has no magnitude to sanity-check against, so "an invented rank slots
into the visual field exactly as plausibly as a real one." There is **no rank column in the data and
no rank typed anywhere in this workspace.** Each is the position of a country in a sort of every
ISO-coded entity's emissions for that year. So is everything else this beat asserts:

- **Which six countries are drawn**: the countries that held a place inside the world top ten in
  *every one* of the 35 years — China, the United States, India, Russia, Japan and Germany.
  `render.mjs` throws if the answer falls outside 3–8, the range this type can carry legibly.
- **Who the subject is**: the largest climb in the drawn set, required to be unique (India, +5
  places) and at least 2 places.
- **The ordinal words "eighth" and "third"**: indexed out of a word table by the computed ranks.
- **The five countries India overtook and the year of each**: ranked above India in 1990, below it in
  2024, the crossing year being the first year of the unbroken lead that runs to 2024.
- **"had already passed"**: the tense is a claim about chronology, so the sentence is only built from
  the crossings the frame does not draw, which are the ones that happened first.
- **The alt text's own aside about the top of the table**: the country holding rank 1 in the first
  and the last year, and the first year of the closing leader's unbroken run.

## Exact values — computed from `data.csv` (world rank by annual CO₂ emissions)

| Country | 1990 | 2024 |
| --- | --- | --- |
| China | 3 | **1** |
| United States | **1** | 2 |
| **India** | **8** | **3** |
| Russia | 2 | 4 |
| Japan | 4 | 5 |
| Germany | 5 | 10 |

India's crossings: United Kingdom 1991 · Ukraine 1992 · Germany 1999 · Japan 2006 · Russia 2009.
Ranks 6 to 9 in 2024 belong to countries this chart does not draw (Indonesia, Iran, Saudi Arabia,
South Korea); the rendered caveat says so rather than leaving the empty rows unexplained.

## Anti-patterns for this case

- **One accent line, not three.** The type sheet allows two or three; the recorded palette carries
  one, and a second hue would be a colour nobody chose. Everything else is a single neutral.
- **Every label is in page ink or muted — never in a line's own hue**, the accented line's own name
  included. That is this type's named, previously-shipped WCAG failure.
- **The accent line is drawn on top and heavier**, so a crossing between it and a background line
  reads as the accent line's crossing rather than a tangle.
- **No line is bridged across a missing period.** None needs to be: the drawn set is by construction
  the countries present in the band in every year, and the component throws if any track's rank count
  does not match the year count.
- **Rank is not magnitude**, and the caveat says so in the frame: nothing in the drawing implies how
  far ahead anyone is. The title claims a position, not a size — which is also why
  `static-discipline.md`'s zero rule has nothing to say here: no mark's LENGTH encodes anything.
- **Gutters are measured, never fixed**: the rank column, both name columns and the crossing
  captions are all sized from the real strings in the real font.

## Verification

`bun proof/static-bump-emitter-rank/render.mjs`, then the PNG was opened and looked at. What was
read off the rendered pixels: the three ringed crossings sit on India's line at 1999, 2006 and 2009
with their captions clear of every line; the six names at the 1990 column read down ranks 1, 2, 3, 4,
5 and 8 and the six at 2024 down 1, 2, 3, 4, 5 and 10, none overlapping; India's name is the only
one in bold and no name is in the accent colour; the year axis runs 1990–2024 on five-year ticks, so
each captioned year is locatable; and the sentence under the axis names the two undrawn crossings.

## Source line

`Source: Global Carbon Budget (2025) – with major processing by Our World in Data · fossil fuels and industry only; land-use change is not included`

## Alt text

Computed by `render.mjs` and passed straight into the component's `<desc>`; it is echoed to the
console on every render so it can be read beside the frame it describes.

## Size — 2026-08-11

**Pinned: landscape (1920 x 1080)**, in the front matter, read by `readPinnedSize`, verified from the
delivered PNG's own IHDR. It shipped 1800 x 1440 before, from a `FRAME` constant this component
EXPORTED so its own runner could repeat it — the two literals that agreed with each other, in their
most explicit form. The export is gone.

**Square and portrait are refused by `type-at-size.mjs`.** A bump chart's y axis is a rank, read top
to bottom, and its x is time running left to right; it has no twin form (rotating it would put time
on a vertical axis) and no aspect range has been measured for it. One probe run reverses that.

**What the pinned frame changed.** Every spacing literal is named and scaled, including the two
track weights and the terminal-dot halo — a 2.5px line and a 4px dot are 900px-frame quantities, and
at 1920 they read as hairlines around specks. The beat also gained a rank-pitch floor: a bump's rows
carry NAMES at both ends, so below one line of name type per rank row the terminal labels print
through each other, and neither `assertTypeFloor` (which measures the type) nor `assertPlotAspect`
(which never clamps an unmeasured type) can see that.
