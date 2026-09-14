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

## One accent for an ITEM, and a neutral for the other — not one hue at two chromas

`palette`'s subject-fit branch FIRES here and is still refused, and the reason is structural to the
type. `matchConvention` holds grounded conventions for renewables, fossil fuel, water and heat, and
this beat's eight spokes are exactly those substances. But on a radar **the hue belongs to the ITEM,
not to the axis**: eight source-conventional hues would colour the spokes of a plate whose entire
read is the shape of two polygons, and the two countries would then have nothing left to be told
apart by. So the accent identifies FRANCE, the subject of the headline, and Germany takes the
furniture's own muted step. One accent, one neutral, two shapes — which is what
`references/types/radar.md` asks for when it caps a radar at about three items.

This file previously carried a paragraph about "one hue, two chromas, and no imported second hue",
reasoning about "the emissions before and after the year the cumulative total reaches its midpoint".
There is no pivot year on this page and no quantity split into halves of itself; that text belonged
to a different beat and was copied here. The rule it invoked,
`two-states-of-one-measure-are-one-hue-at-two-chromas`, is not this beat's case: two COUNTRIES are
not two states of one measure.

## What the page actually paints — four fills, measured in every direction

The delivered drawing carries exactly four distinct fill values, and the same four in all three
filed directions: the accent-derived tone on France's polygon and its eight vertices, the neutral on
Germany's, the direction's ink on the nine words set inside the viewBox (eight spoke names and the
ceiling), and the direction's ground on the plate rectangle. Two further colours are stroked and
never filled: the ground again, as a one-pixel ring separating a vertex from whatever it sits on,
and the furniture's grid on the rings and spokes.

| measured against the colour the page really paints | creme | nocturne | rapport |
| --- | --- | --- | --- |
| France's outline on the ground | 6,85 | 10,93 | 7,31 |
| Germany's outline on the ground | 3,95 | 5,16 | 3,95 |
| **France's outline against Germany's** | **1,74** | **2,12** | **1,85** |
| the spoke names on the ground | 20,41 | 17,78 | 21,00 |
| a vertex's lift against its own resting colour | 1,64 | 1,17 | 1,60 |
| that lift on the ground | 11,22 | 12,82 | 11,69 |
| the polygon's FILL on the ground | 1,29 | 1,38 | 1,28 |

The first two rows clear the 3:1 non-text floor in every direction. The third is the row this corpus
has been burned on twice — two colours clamped independently to the same floor against the same
ground come out identical by construction, measured at 1,023:1 on one beat and 1,000:1 on a
lollipop. They do not here, because they are not derived the same way: France's is the direction's
own accent adjusted only if it falls under the floor, and Germany's is a fifty-per-cent mix of the
ground toward the ink, adjusted the same way. Different origins, and 1,74 to 2,12 apart.

## The fill is below the floor ON PURPOSE, and the mark is the outline

The last row says the polygon interiors measure 1,19 to 1,38:1 against the ground, and against each
other 1,07 to 1,13:1 — far under any floor. That is not an oversight and it is not a colour anybody
failed to clamp. `references/types/radar.md`: *"Fill under each polygon, if used at all, needs enough
transparency that a reader can still see where two overlapping shapes diverge rather than one
polygon simply hiding the one behind it."* An opaque fill is the one thing this type forbids. So the
fill is a wash at `fill-opacity: 0.16` whose whole job is not to hide what is behind it, and **the
mark a reader reads is the two-pixel outline**, which is where the floor is measured and cleared.
Measuring this page's compliance on the interiors would be measuring the wrong shape.

## The defect this pass found

A vertex used to take the format's default `.pt` treatment under a pointer: `fill: var(--muted)`.
That default is right for a beat whose points are one series and wrong here, because `--muted` is
the furniture's neutral and **the neutral is what this page draws Germany in**. Measured: `--muted`
against Germany's own tone is 1,55:1 in creme, 1,41 in nocturne, 1,57 in rapport — indistinguishable.
Hovering a French vertex repainted it in the other country's colour, on a plate whose only channel
for telling the two apart is that colour.

Each vertex now carries its own `--mark-active`, walked from **its own fill** toward the direction's
ink until it is at least 1,12:1 from where it started and still 3:1 on the ground — both floors
measured, and the component throws rather than ship a lift that clears neither. A French vertex
lifts to a deeper France and a German one to a deeper grey; the hue never crosses sides.

## What is not chromatic

Nothing else. The rings, the spokes, the spoke names, the ceiling label, the readout on the plot and
the sentence under the control are all steps off the direction's own ground and ink, computed by
`deriveFurniture` at render time and never written here as a literal. The control's chosen pill is
ink-on-ground for the same reason: the accent is what the argument is drawn in, and a control that
borrowed it would make the one colour that means something also mean "you clicked here".
