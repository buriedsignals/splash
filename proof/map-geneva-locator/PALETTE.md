---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#C68900, #009E73"
origin: journalist
---

The answer recorded for this beat: the three category colours the map already draws, in the order
it draws them — UN system, other intergovernmental, other international body — plus the white
ground it is drawn on.

`origin: journalist`, and the reason is worth writing down rather than smoothing over. These are
Okabe–Ito, the CVD-safe qualitative set this project cycles categorical colour from; they are not
Heidi.news's house colours and no subject convention produces them (`matchConvention` returns
nothing for "international organisations in Geneva", and inventing a convention for one beat would
be a colour that feels right rather than one a reader already holds). A vetted default chosen for
this beat is a choice somebody made, and `journalist` is the honest word for it.

**One of the three moved, and the measurement is why.** The beat drew Okabe–Ito orange `#E69F00`
for "other intergovernmental", and on this white ground that measures **2.25:1** — under the 3:1
floor WCAG 2.2 SC 1.4.11 sets for a mark a reader identifies data by. `palette` would never
have recommended it; nothing measured it, because until 2026-08-10 nothing between the proposal and
the render did. Recorded instead: `#C68900` at **3.01:1**, which is not an invented colour — it is
`adjustToContrast` walking the beat's own orange toward the ink pole and stopping at the first step
that clears, the same arithmetic the refusal prints beside the failure. The render moves: the
"other intergovernmental" markers and their legend swatch go one step deeper.

A locator's categories ARE its data — the marker colour is the only thing separating three tiers of
an institutional system on a plate that carries no other encoding. So they are read through
`seriesInks`, not typed into the component: `render.mjs` beside this file reads all three and
passes them in, and `LocatorStill.tsx` names no hex of its own.
