---
ground: "#FFFFFF"
accent: "#0B7A5E"
origin: journalist
---

The answer recorded for this beat: the white ground the newsroom publishes on, and a hue of the
beat's own for the marks.

`origin: journalist`. The newsroom's house accent is `#0B7A75`, and it is **30,0° of hue from
`#1F6FB2`**, the water convention `shared/map-beat/tints.mjs` paints every basemap's sea in — inside
the 40° `readPixelPalette` counts as ONE pole. On a beat whose marks never leave the land that
collision is a fact about two colours and not about the drawing, and `markOccupancy` says so. Not
here: measured on this beat's own plate, 9 of its 32 cells (28,1 %) cover more water than land — a
cartogram's seating is not a geolocation, so ISL, SWE, IRL, NLD, DEU, POL, BEL, PRT and CYP come
down on the Atlantic, the North Sea and the Baltic. A mark seated on the sea and drawn in the
sea's own pole is the blue-on-blue the Danube shipped, one beat over.

**So the water convention is declined, and the hue recorded is the house accent moved the smallest
distance that leaves the COMPOSED accent clear of the sea's pole in all three directions** — 12,4°
of hue, `#0B7A75` → `#0B7A5E`, recorded at 164,9° against the water's 207,3°. The record's hue is not
what is measured: `composeAccent` sets it in each direction's own key and the colour that reaches the
paint reads **42,5° / 42,6° / 42,7°** from the water's pigment. A 10,0° rotation also clears the 40°,
at 40,2° — a fifth of a degree of margin, which is inside the composition's own rounding, so it is not
the number recorded. Not a colour chosen for its own sake and
not one borrowed from a sibling: the newsroom's own colour, kept as close as a reader can still tell
it from the water its hexagons cross. Only the HUE is recorded, and only the hue travels:
`composeAccent` sets it in each direction's own saturation and lightness and walks the lightness
until it clears the floors on the paper and on both grounds, so the three renders stay three
directions rather than collapsing into one palette.

**One hue, five steps in lightness, and the same five in all three states.** That is not a
preference — it is the direct consequence of what this page's control does. `pool.ts` holds the
CLASS BOUNDS still and moves the VALUES, so every grain is in the same unit (`pour 1 000
habitants`) and lands in the same five tranches. The key therefore does not change when a reader
presses a grain, and a key that does not change has to be learnt once. A second hue, or a ramp that
re-scaled itself per grain, would put back exactly the re-learning the gesture is built to avoid.

The ramp is built by the direction's own colours at render time and never written here as a
literal: `low = mix(accent, ground, 0.88)` lifted to the non-text floor against the ground it
actually sits on, `high = mix(accent, ink, 0.3)`, and the five classes interpolated between them.

## What the page really paints, measured on the delivered HTML

Every class against the ground **that direction paints**, and the ink each cell's own code and
number are set in (`inkOnFill` picks per cell, so both floors are cleared cell by cell rather than
once for the ramp):

| class | creme (`#FFFCEE`) | nocturne (`#111044`) | rapport (`#FFFFFF`) |
| --- | --- | --- | --- |
| moins de 5 | `#8d908f` · **3,13:1** | `#596583` · **3,06:1** | `#8d9295` · **3,14:1** |
| 5–10 | `#6e7b8b` · 4,19:1 | `#648697` · 4,57:1 | `#6f7e88` · 4,19:1 |
| 10–20 | `#4f6787` · 5,63:1 | `#6fa7ab` · 6,59:1 | `#52697b` · 5,73:1 |
| 20–30 | `#2f5283` · 7,69:1 | `#79c8bf` · 9,16:1 | `#34556e` · 7,86:1 |
| 30 et plus | `#103d7f` · 10,23:1 | `#84e9d3` · 12,34:1 | `#164061` · 10,82:1 |

The palest class clears the non-text floor of 3,0 in all three, with 0,06 to spare on nocturne —
that margin is what `floorAgainstGround` exists to guarantee, and it is why the ramp starts where it
starts rather than at a prettier tint.

Adjacent steps, measured against each other: **1,330–1,364** on creme, **1,346–1,494** on nocturne,
**1,331–1,377** on rapport. Five steps is what this ramp carries; the repo's own recorded trap is
that a ramp built inside `contrast(accent, ground) / 3` runs out of room past four or five crans and
starts measuring 1,007:1 between neighbours. At five, each step is still a third again the one
below it, and the classes are NAMED in the key in the data's own units rather than left to be read
off the shade.

## The correction this file records, because it was measured and not reasoned

**The seat outside the count used to be the palest class, exactly.** Ukraine is drawn — it is the
origin country, and leaving a hole where it sits would be a different lie — but it is outside every
grouping and prints the word `origine` where the others print a number. Its fill was
`mix(ground, ink, 0.16)` put through the same `floorAgainstGround` as class 0.

Two colours floored **independently** on the same floor against the same ground come out the same
colour by construction, and they did:

| | origin fill | class 0 | measured against each other |
| --- | --- | --- | --- |
| creme | `#929088` | `#8d908f` | **1,007:1** |
| nocturne | `#636285` | `#596583` | **1,001:1** |
| rapport | `#929292` | `#8d9295` | **1,011:1** |

On the map a reader could still tell them apart, because one cell says `origine` and the others say
a number. **The key could not.** It offered a swatch for `moins de 5` and a swatch for
`Ukraine · origine` in the same colour, which teaches a reader that a country nobody counted is a
country with the lowest rate.

There is no room to separate them inside the ramp: class 0 sits at 3,13:1 and the floor is 3,0, so
nothing legal fits below it, and anything a visible step above it collides with class 1 at 4,19:1.
So the seat leaves the ramp altogether: **it is the ground**, an empty seat, with an outline that
clears the non-text floor so the seat is still a seat.

| | seat (= the ground) vs the five classes | its outline vs the ground |
| --- | --- | --- |
| creme | 3,13 / 4,19 / 5,63 / 7,69 / 10,23 | `#8c8b83` · **3,33:1** |
| nocturne | 3,06 / 4,57 / 6,59 / 9,16 / 12,34 | `#7c7c98` · **4,40:1** |
| rapport | 3,14 / 4,19 / 5,73 / 7,86 / 10,82 | `#8c8c8c` · **3,36:1** |

The component now REFUSES to draw if the seat and any class measure under 1,5:1 against each other,
and the refusal was verified by putting the old fill back: *"the seat that stands outside the count
and the class \"moins de 5\" measure 1.007:1 against each other"*, creme and rapport both.

## Nothing else on this page is chromatic

The block outline that appears at `la région` is `mix(ink, ground, 0.12)` — ink laid ON the cells,
measured against the class fills it crosses rather than against the ground, because that is what it
is drawn over. The legend swatch borders, the control chrome and the figures are steps off the
direction's own ground, computed by `deriveFurniture` at render time. There is no second hue
anywhere, and the accent is never used as a highlight: the thing that answers a pointer is the
hexagon itself, darkened from its OWN fill.
