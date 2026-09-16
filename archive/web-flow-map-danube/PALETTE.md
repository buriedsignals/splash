---
ground: "#FFFFFF"
accent: "#9A6B00"
origin: journalist
---

The answer recorded for this beat: the white ground and the colour the Danube is drawn in.

`origin: journalist`. `matchConvention` fires on "river" and offers blue, and blue is what the
basemap already gives the Danube — a river in the basemap's own water colour is a river a reader
cannot pick out. Declining a convention on purpose is a journalist's decision, and it is the same
one the still and video siblings recorded.

## The accent moved AGAIN between the still and the web, and the floor is why

The still sibling (`proof/mapmore-flow-danube`) records `#C68900`, at **3,01:1** on this ground —
walked there from Okabe–Ito `#E69F00` (2,25:1) to clear the **3:1** floor WCAG 2.2 SC 1.4.11 sets
for a mark a reader identifies data by. On a still that is the whole question: the route is a mark,
and the only text drawn in the accent is a legend swatch's label.

**This format spends the accent on TEXT as well**, and text has a different floor. The eyebrow and
the value register are drawn in it, so 3,01:1 is under 4,5:1 and `composeDirections` refused all
nine direction pairings on this beat's first render, naming both registers:

```
0 art directions hold up for this beat. None is chosen for you.
   creme/creme/the newsroom — eyebrow reads 3.01:1 on #FFFFFF, floor 4.5;
                              value reads 3.01:1 on #FFFFFF, floor 4.5
```

Recorded instead: **`#9A6B00` at 4,69:1** — not an invented colour, and not a colour borrowed from a
sibling beat: `adjustToContrast("#C68900", "#FFFFFF", 4.5)`, the still's own hue walked one further
step toward the ink pole by the same arithmetic that produced the still's own. The river goes one
step deeper and stays the same hue, which is what keeps the three siblings recognisably one beat.

## What is measured on this page, and against what

**The river is drawn OPAQUE, and that is this beat's measurement rather than the fan sibling's.**
`proof/web-flow-map-ukraine-protection` paints its bands at 55 % because thirty of them cross, so
what a reader sees there is a composite and the composite is what it measures. **Nine disjoint
slices of one river cross nothing** — where two stretches lie over one course they are the same
water, and the thinner is drawn on top. So the ink IS the colour, and `danubeInks` measures the ink
directly against both grounds this river runs through:

- the plate's **water** (`mix(ground, accent, 0.16)`) — the delta and the reservoirs;
- the plate's **land** (`mix(ground, ink, 0.07)`) — everything else.

It walks the accent toward the direction's own ink until the WORSE of the two clears the non-text
floor, and the render REFUSES if no dose does. Measured on the three filed directions: the river
reads **5,66:1** on creme's land, **6,06:1** on rapport's, **9,08:1** on nocturne's.

**A pointed-at stretch is the stretch itself, in a fuller dose of its own ink** — never a dot on top
of the mark. The dose is SEARCHED, not set, and `MARK_SEPARATION` is this beat's own **1,25**, not
the fan's 1,4: an opaque ribbon has less room above it than a 55 % one, and 1,4 found no dose that
also kept the non-text floor on nocturne. Searched against this beat's own three renders; a number
found on another dataset transfers silently and nothing goes red.

**The spring** is that same answering ink, ringed in the direction's ground. A pin, not a
measurement: it encodes nothing, so it takes no size from the data.

**The counted-not-drawn stub** in the table is furniture rather than a mark — it sits on the page,
not on the basemap — so it is measured against the GROUND at 3:1 and drawn as a dashed outline with
no fill, the same convention the choropleth's missing country wears.

**The nine territories take no colour at all**, and that is a departure from the still sibling, which
gives each of them its own hue from Tol's Muted set. On a still the fills carry the numbering; here
the numbering is the order rail and the ranking is the table, both of them HTML text, so nine hues
would be nine decorations competing with the one mark that carries the argument. The ground under
the river is `countryGround`'s single neutral land tint, and the only chromatic thing on the page is
the river.
