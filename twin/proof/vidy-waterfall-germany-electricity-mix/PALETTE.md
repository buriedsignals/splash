---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#D55E00, #3D3D3D"
origin: journalist
---

The answer recorded for this beat: its three role colours, in the order the bridge draws them —
increase in Okabe-Ito blue `#0072B2` (5.19:1 against the ground), decrease in Okabe-Ito vermillion
`#D55E00` (3.87:1), and the two total bars in the neutral `#3D3D3D` (10.86:1). All three clear the
3:1 mark floor SC 1.4.11 sets, and all three are exactly the values `render.mjs` named as hex
literals until now, so the migrated render comes out unchanged.

`origin: journalist` says who chose them. `matchConvention` was checked and returns nothing useful
here for two separate reasons: a bridge from coal and nuclear to renewables hits `fossil` and
`renewables` both, and a multi-match returns null by design — which series carries the argument is
an editorial decision, not a table's — and in any case these three are ROLE colours (up, down,
total), not subject colours. The pair is deliberately cool/warm rather than a plain red/green, which
a reader with a colour-vision deficiency could not separate; the grey `total` sits off that hue axis
entirely so a total bar is never mistaken for a step.

**Three data colours, so `seriesInks(palette, 3)`.** `render.mjs` takes all three through it rather
than reading one accent and two more literals: recorded accents come back first and in order, so
the render does not move, and a beat that ever asks for more roles than were recorded fails loudly
instead of padding with the furniture grey — which is what `muted` is, and it is derived from
`ground` by `deriveFurniture` for the axis and the source line only. The subject's emphasis reuses
the already-spent `total` colour as a fourth CHANNEL, never a fourth hue.

Delete this file and the render refuses, naming every directory it searched.
