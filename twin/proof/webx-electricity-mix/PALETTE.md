---
ground: "#FFFFFF"
accent: "#009E73"
accents: "#0072B2, #D55E00"
origin: journalist
---

The answer recorded for this beat: a bespoke categorical set the journalist chose — three
Okabe-Ito hues, the values this beat was already drawn in — kept over the house teal. They are
listed in the order the stack draws them (`STACK_ORDER` in `stacked-bar-geometry.ts`): renewables,
nuclear, fossil. `seriesInks(palette, 3)` therefore returns exactly these three, in exactly that
order, and the chart does not move.

Why three recorded accents rather than one plus two derived shades. A 100%-stacked column encodes
its three categories by FILL and nothing else — the non-bottom bands float on a moving floor, so a
reader identifies a band by its colour before its position. Three shades walked off one accent
differ only in lightness, which is the one axis a stacked column already spends on nothing; three
distinct hues is what the type needs, and which three is the newsroom's decision, not the
component's. Recording them is how that decision reaches the render.

`twin-palette`'s subject option was checked and deliberately NOT taken, and this is the beat where
that matters most. `matchConvention` would fire on BOTH `renewables` and `fossil` here — and it
returns null on a multi-match precisely so no table picks which of two series carries the argument.
The subject conventions also propose ONE accent against a ground, never a categorical set: they are
out of scope for a three-way split by their own reference sheet. So the recorded set stands.

Measured against this ground: `#009E73` 3.42:1, `#0072B2` 5.19:1, `#D55E00` 3.87:1 — all clear of
the 3:1 non-text floor an accent has to hold (WCAG 2.2 SC 1.4.11). The printed share inside each
band is separately held to its own floor: the runner derives one ink per fill and passes it as
`segmentInk`, so the text rule is measured against the band, not against the page.

`render-web.mjs` beside this file reads all four values with `readPalette` and names no hex of its
own; `StackedBarWeb.tsx` takes them as the `colours` prop.
