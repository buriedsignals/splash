---
size: landscape
type: proportional-symbol
---

# Beat — the 2011 Tohoku earthquake, the largest of 17 great western-Pacific quakes in the file

**Type:** proportional symbol. **Medium/genre:** map / static **and** map / video (one component
family, two genres, over two baked plates — 496 px for the still, 620 px for the video, both square
over 83° of longitude). **Size:** landscape (1920 × 1080), pinned in the front matter above and read
from there by `render.mjs` with `readPinnedSize`. It used to say "article web, 900 × 560", checked
by nothing, while each component carried its own `const FRAME` and the render script repeated the
same two literals.

**The still ships at landscape and the video ships at no size at all.** A beat with two genres is
two answers, not one: a still is read in a ~900 px article column at a 26 px floor, a video is
watched on a phone turned sideways at a 30 px floor, and this beat's words fit the first budget and
not the second. Both tables are read from the same pin.

## What each size does with this geography — THE STILL

The plate is SQUARE (496 × 496 over 83° of longitude, `frameCorners` 90.0 → 173.0), and the map is
drawn at the plate's own aspect at every size — never stretched, never cropped. 83° against a
`360 × aspect` ceiling of 360° is far inside the Mercator bound, so the ceiling is an assertion here
and never a clamp.

| size | delivered | the map | column | leftover |
| --- | --- | --- | --- | --- |
| landscape 1920 × 1080 | **yes**, measured 1920 × 1080 from the PNG's own IHDR | 809 × 809, bound by height | 871 px | 203 px of air above the caveat |
| square 1080 × 1080 | refused | — | — | — |
| portrait 1080 × 1920 | refused | — | — | — |

Nothing is letterboxed at landscape: the credit takes 2 lines across the foot, leaving a 1750 × 809
content box, and a square plate in it is bound by HEIGHT — so the map takes 809 × 809 and the 871 px
left on the other axis is the text column. The map is never given more than its own geography can
fill and it is never stretched — `mapStageBox`. The column's words come to 606 px of the 809, and
the 203 px of slack lands in one place, between the legend and the caveat, where it reads as air.

Both refusals are the type floor's, not the geography's. At a 36 px floor the credit alone takes 3
lines of the 936 px band, and the column beside a full-height plate is 93 px — far under the 319 px
this beat's own longest title word needs at a 60 px title. The plate gives width back until the
column can hold that word, and even at the 319 px floor the column's furniture (a 7-line title, a
3-line legend caption over a 49 px ruler, an 8-line caveat) takes **1342 px of the 747 px** left
after the credit. Portrait is the same column inside Meta's 979 px safe band: 1342 px of 646.
`render.mjs --still --size square` reproduces each refusal with its own numbers in it.

## What each size does with this geography — THE VIDEO

**No size. R9, at all three, and the arithmetic is the reason.** The video table's landscape row
carries a 30 px legibility floor and a `typeScale` of 2.5 over a 900-wide base; this beat was tuned
at 1080 × 1080 with its smallest token at 15 px, which is 5 CSS px on the 360 dp phone a social
video is watched on. Raising it to the floor is the whole point, and it costs height.

Measured at the cheapest arrangement each size allows — title, caveat and credit run the FULL
content width, so they wrap as few times as they ever can, and whatever they leave is the band the
map and its side column share. Every number below is emitted by the component's own refusal:

| size | band | the words | left for the map | the plate |
| --- | --- | --- | --- | --- |
| landscape 1920 × 1080 | 910 px | 618 px — title 3 lines (293), caveat 3 (125), credit 2 (90), block air (110) | 292 px | 292 × 292 |
| square 1080 × 1080 | 936 px | 1347 px — the column is 936 px instead of 1750, so the title wraps to 6 lines, the caveat to 5, the credit to 4 | **−411 px** | nothing |
| portrait 1080 × 1920 | 835 px (Meta's safe band, 269–1248, less the margin) | 1347 px, the same column | **−512 px** | nothing |

The floor a plate is refused under is this beat's own, and it has two halves. **443 px** is the
longest word the beat has to set at an 83 px title. **1300 px** is what the plate must be for the
SMALLEST mark to stay the 4 px disc `MIN_LEGIBLE_RADIUS_PX` calls the least a reader can resolve —
because the mark is 0.66% of the plate and a landscape frame pixel is 0.47 of a CSS one. At the
292 px landscape leaves, that mark is **1.9 px, 0.9 CSS px**: a proportional-symbol map whose small
marks are sub-pixel has lost the only channel it argues in. Square and portrait have no plate at all.

The removal ladder was run and it does not reach. R1 and R2 do not exist here (a map has no axis
title and no value ticks). R4 recovers the conclusion and R7 the caveat, ~190 px between them
against a landscape shortfall of over 1000 — and R7 costs the sentence that says the circles are
sized by ENERGY and not by the magnitude number, which on this beat is not a caption but the
encoding's own honesty line: the whole "claim was rewritten, not the encoding" argument below rests
on it being in the frame.

So `QuakeSymbolVideo` refuses at every size, with those numbers in the message, and this beat
delivers its still. Its 1080 × 1080 mp4 and its frames were produced before the size table existed —
a complete and well-composed picture whose legend labels are 15 px on a 1080 frame, 5 CSS px on the
phone it is watched on, which is what the table's floor exists to refuse — and they are not left in
the tree contradicting the pin.

## What the bigger frame showed, and what it cost

Three things 900 × 560 was hiding, all found by opening the render and none visible to any counter:

1. **The size legend was drawn at the PLATE's scale, not the map's.** `radiusOf(v)` straight, with
   no `* scale` — correct only because the plate happened to be drawn at 1:1 (496 into 496). At an
   809 px plate the ruler's keys would have been 62% of the size of the marks they key, which is a
   ruler measuring something else. The legend now scales with the map.
2. **A left/right label model put a number on the wrong mark.** `labelPlacement` chooses between
   RIGHT and LEFT on a typed 130 px margin measured against a 496 px plate, and it has nowhere else
   to go: where neither side is clear it draws the label over another MARK and reports success. At
   809 px the M7.9 event inland of Tohoku sits INSIDE the subject's own 62 px accent disc, and its
   label was drawn across the middle of it — so the one mark this beat is about carried a number
   that is not its own, beside a colour whose entire job (see below: "the accent outline, not the
   size, is what identifies it") is to identify it. Every counter was green: the label was shown,
   and nothing here measured whether a shown label sits on somebody else. Replaced by the locator's
   ladder — right, left, above, below, first candidate wholly on the plate AND clear of every other
   mark's disc wins, and a label with no clear candidate is not drawn at all. 11 of the 17 points
   are labelled at landscape; the subject is guarded by name and the render throws if it is dropped.
3. **The credit was the last block of the TEXT COLUMN.** At 900 × 560 that was three lines of small
   type in a 308 px column and it read as a credit; at 1920 × 1080 it is still three lines, and
   three lines walked up from the margin put its first baseline 0.83 down the frame — outside the
   bottom eighth `credit-anchors-to-the-frame-bottom.test.ts` measures, for a reason that has
   nothing to do with the credit and everything to do with the column it was in. It is now a strip
   across the foot at the full content width, where it is two lines, and the map and the column
   share the band above it.

Also raised: the three sub-12 base tokens (the point label at 11, the caveat and legend label at
11.5). `sizes.mjs` derives every row's `typeScale` from a smallest base token of 12 — that is where
2.2 and 3.0 come from — so a beat carrying 11 misses every floor by construction and would need
`typeScaleFor` to inflate the whole hierarchy to rescue three tokens.

## What the size migration did NOT change: the marks are 5.8× the nearest-neighbour ceiling

`markRadiusCeilingPx(medianNearestNeighbourPx, typedCeiling)` puts a proportional mark's ceiling at
half the plate's own MEDIAN nearest-neighbour gap, the radius at which the typical pair of marks
exactly touches. Measured on this beat's committed plates:

| plate | median nearest neighbour | ceiling | largest mark drawn | smallest mark drawn |
| --- | --- | --- | --- | --- |
| 496 px (still) | 12.96 px | 6.48 px | 37.76 px — **5.83×** the ceiling | 4.00 px — 0.62× |
| 620 px (video) | 16.18 px | 8.09 px | 38.44 px — **4.75×** the ceiling | 4.07 px — 0.50× |
| the same 496 plate drawn at 809 px | 21.14 px | 10.57 px | 61.60 px — **5.83×** the ceiling | 6.52 px — 0.62× |

**The ratio is scale-invariant, and that is the finding.** Every radius is a fraction of the plate
and every distance between marks is drawn from the same plate, so both scale together: drawing the
map at 809 px instead of 496 makes every mark bigger and moves the ratio not at all. The audit
measured this beat's WEB sibling (`mapgen-symbol-web`) at 2.3×; this one is higher because it
deliberately encodes area ∝ ENERGY rather than ∝ magnitude, which spreads the radii 9.44× instead of
1.08× and puts the largest mark far past the median gap while putting the smallest one under it.

It is not a defect this migration introduced and not one it could fix by choosing a frame. It is
already disclosed in the frame: the caveat counts it — *"9 of the 17 overlap a neighbour; smaller
circles are drawn on top"* — and `drawOrder` guarantees the small marks paint last. Bringing the
largest mark under the ceiling would mean giving up the energy encoding, which point 2 below rejects
in writing and for reasons that have not changed.

**What the migration DID change, and it is left as a follow-up rather than absorbed.** The plate now
takes 809 of a 1920 px frame where it took 496 of 900 — 42% of the width against 55% — because the
type grew 2.2× while the frame grew 2.13× and the credit strip and the bigger margin took the
difference. `MIN_LEGIBLE_RADIUS_PX = 4` was a CSS-pixel judgement made when a 900-wide frame was
read at 900 CSS px, so a frame pixel WAS a CSS pixel; at 1920 read in the same 900 px article column
it is 0.47 of one. The smallest mark therefore measures 6.5 px on the delivered PNG and **3.1 CSS
px, against the 4 it was tuned to be** — a 24% shrink in apparent size that no counter sees, because
every guard here measures frame pixels. Closing it means expressing that floor in CSS px and letting
`energyRadiusScale` raise the largest mark to about 10% of the plate (still inside its own 12%
ceiling), which changes the overlap count this beat's caveat states out loud. That is a change to
what the picture claims, so it is named here rather than made at the end of a size migration.

## Claim

Of the great earthquakes in this file, the 2011 Tohoku event is the largest: **magnitude 9.1**,
against a next-largest of **8.6** (2005 Sumatra–Nias). Seventeen events of magnitude 7.8 or greater
are plotted, sized by magnitude.

## Data

- Source: USGS Earthquake Catalog (earthquake.usgs.gov), M7.8+, western Pacific.
- `quakes-symbol.csv`: **17 rows**, columns `time, mag, longitude, latitude, place`.
- Extent: longitude 97.05 → 166.38, latitude −12.52 → 46.59 — the western Pacific rim, from Sumatra
  to the Kuril Islands.

## Exact values — computed 2026-08-09 from `quakes-symbol.csv`

| Mag | Date | Where |
| --- | --- | --- |
| 9.1 | 2011-03-11 | Great Tohoku earthquake, Japan |
| 8.6 | 2005-03-28 | 78 km WSW of Singkil, Indonesia |
| 8.4 | 2007-09-12 | 122 km SW of Bengkulu, Indonesia |
| 8.3 | 2006-11-15 | Kuril Islands |
| 8.1 | 2007-04-01 | Solomon Islands |
| 8.1 | 2007-01-13 | Kuril Islands |
| 8.0 | 2013-02-06 | Santa Cruz Islands |

…then six at 7.9 and four at 7.8. Minimum in the file **7.8**, maximum **9.1** — the "M7.8+" in the
source line is exact.

- **Years present: 2005 → 2017**, derived by `yearWindow()` and used verbatim in the title, the
  source line and the alt. Every row falls in that window; there is no row after 2017-01-22.
- Energy arithmetic behind the caveat: one whole magnitude step is 10^1.5 = **31.6×** the energy, so
  "roughly 32×" is right; Tohoku (9.1) against Sumatra (8.6) is 10^(1.5 × 0.5) = **5.6×** the energy,
  and against the smallest event drawn (7.8) it is **89×**.

## Subject and accent

One accent, `#C1440E`, on one mark: the outline of the Tohoku circle. Everything else is a muted
fill. Radius is `scaleSqrt` rooted at zero over `[0, maxMag]` — an equal-AREA encoding, never a
linear radius. Draw order is descending magnitude, so a large circle can never hide a small one
behind it.

## Reveal order (video)

30 fps, 240 frames. `establish` 0–26 (title, source, empty legend) → `reference` 32–52 (the
magnitude legend, the scale the circles will be read against, laid down before any circle) →
`reveal` 70–156 (the 17 circles arriving in the data's own order, largest first) → `subject`
158–178 (Tohoku taking the accent) → `conclusion` 180–202 (the assertion) → `hold` 202–240 (1.27 s
of stillness, well over the half-second floor). Contract-checked: every event starts after the
previous one ends, and `hold` ends exactly at frame 240.

## Anti-patterns for this case

- Never linear-scale a symbol's radius. Area is what a reader compares, so radius must go as the
  square root; the legend caption says which one is in use rather than leaving a reader to guess.
- Never let a reader read circle area as energy. Magnitude is logarithmic: the drawn circles differ
  by a few percent while the events differ by orders of magnitude. The caveat's job is to say so,
  and it is drawn in the frame, not gated behind interaction.
- Do not sort the draw order by anything but size — small circles must be drawn last or they vanish.

## Defects found while deriving this brief — BOTH CORRECTED 2026-08-09

1. **The credited window was seven years wider than the data.** The source line and the alt both
   said "2005–2024" and the title said "in two decades"; the frozen file's last event is
   **2017-01-22**, and there are no rows for 2018–2024. Corrected by DERIVING the window:
   `yearWindow()` in `geo-symbol.ts` reads the years out of the rows' own ISO timestamps, and
   `render.mjs` builds the title, the source line and the alt from it. The rendered title now says
   "between 2005 and 2017", the source line "2005–2017". Re-rendered: `render/static.png` and
   `render/quake-symbol.mp4` (240 frames), both opened and read.

2. **"The largest circle on the map by a wide margin" was contradicted by the beat's own geometry.**
   With radius ∝ √mag rooted at zero, the subject's radius is √(9.1/8.6) = **1.028659×** the M8.6
   circle's — measured through the beat's own `radiusScale`, **+2.87%**, which at the still's 30 px
   maximum is **0.84 px**. Confirmed in the committed `render/static.svg`: r = 30.00 against 29.16.
   (The 29.83 circle in the same file is the legend's M9.0 key, not an event.)

   **The claim was rewritten, not the encoding — and here is why.** Making the sentence true would
   mean either rooting the radius scale somewhere other than zero, which breaks the equal-AREA
   proportion a reader compares, or sizing circles by ENERGY (10^1.5Δ, a 5.6× ratio here), which
   would contradict the legend's own caption, the caveat, and USGS's own convention for event maps —
   a bigger lie than the one being fixed. So the type's discipline stands and the words move: the
   alt now says the subject "is the largest circle, but only just … under 3% wider than the
   magnitude-8.6 circle off Sumatra — a difference of 0.8 pixels at this size. The accent outline,
   not the size, is what identifies it." The percentage is derived through the same scale the
   circles are drawn with, so it cannot drift from what it describes. Looking at the rendered PNG
   confirms the point: the M9.1 circle and the M8.6 circle off Sumatra are indistinguishable in
   size, and only the accent outline separates them.

3. **The size legend did not bracket the data it keyed.** Its three references came from
   `niceReferenceValues`, half-magnitude steps down from the max rounded to the nearest half — for a
   maximum of 9.1 that is 9.0, so the legend's LARGEST key (r = 29.83) was smaller than the largest
   circle on the map (r = 30.00, M9.1), and its smallest key named M8.0 while four of the seventeen
   events drawn are below it, down to M7.8. A size legend is a ruler; it has to start and stop where
   the marks do. Replaced by `spanReferenceValues`, which keys the legend to the smallest mark, the
   largest, and the value halfway between, at the data's own one-decimal precision: **M7.8 / M8.5 /
   M9.1**, radii **27.775 / 28.994 / 30.000**, read out of the re-rendered `render/static.svg`. The
   top key is now the same radius as the M9.1 circle, exactly.

   **What this does not fix, deliberately.** The three legend circles are still within 8.0% of each
   other (was 6.1%), because that is what the encoding says: radius ∝ √magnitude rooted at zero over
   a file spanning 7.8 to 9.1 puts every circle it draws between 27.8 and 30 px. Making those
   circles visibly different would mean sizing by ENERGY, which point 2 above rejected in writing
   and for the same reasons. The caveat in the frame already says the size difference is not the
   event difference — and it says it about "a circle 1.3 units bigger", which is now precisely the
   legend's own span.

## Source line

`Source: USGS Earthquake Catalog (earthquake.usgs.gov), M7.8+, western Pacific, 2005–2017 · basemap © MapTiler, © OpenStreetMap`
(Derived: the magnitude floor, the window and the event count are all read out of the frozen file.)
