# The dot map settles it: a one-line title and the beat still refuses — 2026-08-11

`mapvid-dot-population` is the least word-heavy of the three map videos: the ledger measured its
words at 729 px of a 910 px band, against the hex grid's 879 and the locator's 1191, and its headline
is the shortest of the four beats owing a size pin at 56 characters. **That makes it the case that
decides the shared finding.** If a beat whose title already fits on one line still refuses every
frame, the title was never the whole answer for any of them.

Re-run: `bun proof/mapvid-dot-population/probe/size-budget.mjs`

## R6 FIRED at landscape, on one word

| | |
|---|---|
| as it ships | *Half of this map's people live in 5 of its 42 countries.* (56 characters) |
| shortened | *Half this map's people live in 5 of its 42 countries.* (53) |

Almost nothing in this sentence is not a fact — the quantity (half), what it counts (this map's
people), the count (5) and the field (its 42 countries) — and all of it survives. What goes is one
preposition: English takes "half the people" as readily as "half of the people".

At landscape that one word is worth a whole line, and the margin is worth writing down: the long form
measures **1760 px** against a **1750 px** measure and breaks by **10 px**, so its second line carries
one word. The short form measures 1673 px and fits. A 10 px margin is a real reading and a fragile
one — a longer country name in the data, or a different face, and it goes the other way.

At square, portrait and the beat's own 1080 × 1440 frame R6 **declines**: three lines stay three,
one line stays one. Nothing this beat delivers changes.

## The readings

| frame | rung | plate room | the map it leaves |
|---|---|---|---|
| landscape 1920×1080 | keep everything | **−2 px** | the words alone overrun the band |
| landscape | **R6** | 88 px | 99 × 88 — **5% of the frame's width** |
| landscape | R6+R7 (conclusion gone) | 157 px | 177 × 157 — 9% |
| landscape | R6+R7+R3 | 203 px | 229 × 203 — 12% |
| landscape, **floor tuning** | keep everything | 212 px | 239 × 212 — 12% |
| landscape, floor tuning | R6+R7+R3 | 274 px | 310 × 274 — 16% |
| square 1080×1080 | keep everything | **−794 px** | — |
| portrait 1080×1920 (story band) | keep everything | **−751 px** | — |
| *CALIBRATION — 1080×1440 as shipped* | *keep everything* | *924 px* | *936 × 827, 87%* |

## What a 99 × 88 map would be

2,996 dots over 42 countries, one dot per 199,000 people. At the shipped 936 × 827 plate the field
reads as a density — Germany's belt against Iberia's coasts — and the beat's own record already says
five name plates erase 421 of those dots. At 99 × 88 the plate is 1.1% of its shipped area; the dots
are not small, they are gone. That is not a map at a smaller size; it is a different picture.

## The refusal does not rest on the caveat

Here the caveat is the honesty line three times over: a dot's position inside its country is random,
so a cluster edge is not a settlement; each country gets the same slice of the clock, so time on
screen is not population; and Russia and seven micro-territories are excluded. Drop the whole thing
and landscape reaches 330 px (a 373 × 330 map, 19% of the frame), square is still 34 px short, and
portrait reaches **9 px** — a 10 × 9 map. The disclosure is kept and the beat still refuses.

## The finding this beat carries for the lot

The shortest headline of the four, at one line, in the least word-heavy of the three map videos,
leaves **88 px** for a map in a 1920 × 1080 frame. The title was one block among five. What fills
these frames is a genre laying title, plate, key, meter, conclusion, caveat and source in ONE COLUMN
at a 30 px video floor, and a landscape frame answering with 1750 px of width against 910 px of band.
The room is in the width, and taking it is a redraw of the layout — a person's decision, and not a
rung on any ladder.

## The instrument, and its stated limit

`size-budget.mjs` REPRODUCES `DotDensityVideo.tsx`'s baseline arithmetic; it does not render it. At
the beat's own shipped frame it reports **924 px** of plate room where the component really draws
**827**, so it is 97 px **generous** — more room than exists, which can only make a refusal more
conservative.
