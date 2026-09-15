---
ground: "#FFFFFF"
accent: "#0B7A75"
origin: newsroom
---

The answer recorded for this beat: the newsroom's own house colours, as they stand in
`skills/splash/assets/root-template/NEWSROOM.example.md` (`brandColor: "#0B7A75"`,
`ground: "#FFFFFF"`). `origin: newsroom` says who chose them. This is the palette
`composeDirections` reconciles the three filed directions against; the delivered page is drawn in
whichever direction governs it, never in this one.

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
