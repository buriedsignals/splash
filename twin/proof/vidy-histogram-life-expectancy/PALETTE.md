---
ground: "#FFFFFF"
accent: "#B5541E"
origin: journalist
---

The answer recorded for this beat: the rust `#B5541E` the beat has always drawn its subject bin in,
on a white ground. `origin: journalist` says who chose it — this is a bespoke mark colour picked
for this beat, not the newsroom's house teal (`#0B7A75`) and not one of `twin-palette`'s four
subject conventions. `matchConvention` was checked: the table holds renewables, fossil fuel, water
and heat, and the distribution of national life expectancy matches none of them; `heat` is scoped
to rising temperature, not to any warm-looking hue. Recording it as `journalist` says plainly that
somebody chose it rather than dressing it up as a convention it is not.

It measures 4.94:1 against the ground, well clear of the 3:1 mark floor SC 1.4.11 sets, and these
are exactly the two values `render.mjs` named as hex literals until now — so the migrated render
comes out unchanged.

The accent is spent exactly once, on the subject bin. Every other bar, the median rule and every
label are the furniture's own `ink`/`muted`, derived from `ground` by `deriveFurniture` — the beat's
own anti-pattern note is that a mark colour reused as running text falls under the 4.5:1 text floor.
Delete this file and the render refuses, naming every directory it searched.
