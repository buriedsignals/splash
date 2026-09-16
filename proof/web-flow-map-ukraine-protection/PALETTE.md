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
here: measured on this beat's own plate, 13 of its 31 bands (41,9 %) are seated on painted water —
the arms to ISL, IRL, PRT, CYP and nine others run their length across the Atlantic, the North Sea
and the Mediterranean. A mark seated on the sea and drawn in the
sea's own pole is the blue-on-blue the Danube shipped, one beat over.

**So the water convention is declined, and the hue recorded is the house accent moved the smallest
distance that leaves the COMPOSED accent clear of the sea's pole in all three directions** — 12,4°
of hue, `#0B7A75` → `#0B7A5E`, recorded at 164,9° against the water's 207,3°. The record's hue is not
what is measured: `composeAccent` sets it in each direction's own key and the colour that reaches the
paint reads **42,5° / 42,6° / 42,7°** from the water's pigment. A 10,0° rotation also clears the 40°,
at 40,2° — a fifth of a degree of margin, which is inside the composition's own rounding, so it is not
the number recorded. Not a colour chosen for its own sake and
not one borrowed from a sibling: the newsroom's own colour, kept as close as a reader can still tell
it from the water its bands cross. Only the HUE is recorded, and only the hue travels:
`composeAccent` sets it in each direction's own saturation and lightness and walks the lightness
until it clears the floors on the paper and on both grounds, so the three renders stay three
directions rather than collapsing into one palette.

## One hue, one quantity, and no second hue to import

This page draws ONE measure — a number of people, divided by nothing, by the destination's
inhabitants, or by its ground. The three states are three ways of dividing the SAME quantity, not
three quantities, so there is nothing here for a second hue to name. The subject carries no
convention a reader already holds either: there is no "green means renewable" for a displaced
person. So the accent is the direction's own, and it is the only chromatic thing on the page.

## What is actually measured, and against what

**The ribbon is drawn translucent, so its ink is not the colour anybody sees.** Thirty bands cross
each other on this map; at full strength the crossings are unreadable and the picture is a blot. The
bands are therefore painted at 55 % over the basemap — which means the colour a reader sees is the
COMPOSITE of the accent over whatever the band is crossing, and the composite is what
`flowInks` measures. It measures it twice, because this fan crosses two grounds:

- over the plate's **water** (`mix(ground, accent, 0.16)`), which is where the arms to Iceland,
  Cyprus and Malta spend most of their length;
- over the plate's **land** (`mix(ground, ink, 0.07)`), which is where the rest of the fan lies.

The ink is walked toward the direction's own ink until the composite clears the non-text floor on
the WORSE of the two, and the render REFUSES if no dose does. That refusal is the point: this
branch has already shipped 1,75:1 and 2,19:1 on two beats by measuring an ink instead of the colour
the page paints, and a translucent ribbon is the exact shape of that mistake.

**A pointed-at band is the band itself, in a fuller dose of its own ink** — the owner's second
arbitration, never a dot on top of the mark. The dose is SEARCHED rather than set: it is walked up
until the answering band stands 1,4:1 clear of the resting composite it replaces AND still clears
the non-text floor against both water and land. A fixed dose was refused at 1,104:1 on `nocturne`
one beat over.

**The origin node** is that same answering ink, ringed in the direction's ground. It is a pin and
not a measurement: it encodes nothing, so it takes no size from the data and no colour of its own.

**The counted-not-drawn stub** in the table is furniture rather than a mark — it sits on the page,
not on the basemap — so it is measured against the GROUND at 3:1 and drawn as a dashed outline with
no fill, which is the same convention the choropleth's missing country wears.

Nothing else on the page is chromatic. The table's rules, the key's words, the axis type and the
grid are steps off the direction's own ground, computed by `deriveFurniture` at render time and
never written here as a literal.
