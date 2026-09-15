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

**One hue, four steps of it, and no second hue anywhere.** A choropleth partitions ONE quantity —
the share of a country's 2024 electricity that came from low-carbon sources — into ordered bands.
Ordered bands are a sequential ramp: one hue, monotone in lightness, so that the order of the
classes survives a black-and-white print and a colour vision deficiency, because the ORDER is the
only thing the reader has to recover. The hue is the direction's own accent. Nothing on this page is
a second hue.

## The ramp is anchored on the LAND, not on the paper

The thing a country is painted over is not the page's ground. It is the baked MapTiler plate, whose
land is a step off the direction's ground toward its ink (`mix(ground, ink, 0.07)`). Anchoring the
lightest class on the ground at 3:1 — which is what this beat did first — puts it at **3,02:1
against the ground and 2,58:1 against the land** in creme, and it is not a creme accident: rapport
measures 3,01 / 2,57 and nocturne 3,03 / 2,55. All three pass the floor against a colour the page
never paints and fail it against the one it does. That is the choropleth fiche's own trap, sprung:
the measurement was real, and it was against the wrong thing.

So the lightest class is the lightest tint of the accent standing 3:1 off THE LAND, the darkest is
the accent itself, and the two between are walked geometrically in contrast-against-ground. Measured,
per direction:

| direction | ground | accent | land | ramp | vs land | steps apart |
| --- | --- | --- | --- | --- | --- | --- |
| creme | `#FFFCEE` | `#1757B6` | `#edeadd` | `#5c88c7` `#4477c1` `#2e67bb` `#1757b6` | 3,00 / 3,74 / 4,61 / 5,66 | 1,246 / 1,233 / 1,227 |
| rapport | `#FFFFFF` | `#1F5C8B` | `#ededed` | `#638dae` `#4b7ca2` `#356c96` `#1F5C8B` | 3,01 / 3,81 / 4,80 / 6,06 | 1,265 / 1,259 / 1,262 |
| nocturne | `#111044` | `#4FE0C0` | `#222151` | `#307a83` `#3a9996` `#44baa9` `#4fe0c0` | 3,02 / 4,40 / 6,30 / 9,08 | 1,458 / 1,432 / 1,443 |

Every class clears 3:1 against the land it is painted on — so the lightest band can never be mistaken
for a country outside the study — and no two neighbouring classes stand closer than the 1,2:1 this
beat asks of two bands a reader may have to compare a thousand kilometres apart.

## Four classes, and the measurement that settles it

`types/choropleth.md` offers five classes as "a reasonable default", not as a requirement. Five was
built and measured. Its neighbouring steps came out at **1,183 / 1,170 / 1,169 / 1,165:1 in creme**
and **1,195 / 1,187 / 1,191 / 1,189:1 in rapport** — every one of them under 1,2:1, and the ramp
refuses rather than ships. Nocturne would have carried five (1,327 / 1,314 / 1,311 / 1,317:1),
because its accent stands 10,80:1 off its ground where creme's stands 6,64:1; but `classes` is one
number for all four rules and all three directions — a legend whose rank of chips changed length
between directions is a legend that MOVES — so the count is the one the narrowest direction can
carry. **Four is creme's answer, imposed on the other two, and that is the honest trade.** Past four,
name rather than shade.

## What a pointed-at country becomes

Not a fixed dose and not a `brightness()` filter — a filter lightens on a light ground and on a dark
one alike, and a fixed mix measured 1,104:1 one beat over. The dose of ink is walked up until the
result stands 1,4:1 from **the fill it actually replaces** and still clears 3:1 against the land.
Measured: 1,46 / 1,43 / 1,43 / 1,42 in creme, 1,40 / 1,43 / 1,43 / 1,44 in rapport, 1,41 / 1,43 /
1,43 / 1,40 in nocturne. Because each class gets its own answer, a country darkens off the colour the
CURRENT rule gave it — which is the whole reason the pointer keeps working when the reader re-cuts
the map.

## One ramp, painted twice, derived once

Since 2026-09-15 the map is LIVE: the classes are MapLibre `fill` layers over MapTiler's own
Countries tiles, and the table of forty readings under the map keeps the same partition in generated
CSS. So this ramp is now painted by two mechanisms that cannot see each other — a paint expression
in a JSON plan, and a stylesheet — and that is a new way for half a beat to answer one rule while
the other half answers the rule before it.

It is derived ONCE. `choroplethRamp` in the beat's own component returns the four colours and their
four pointed-at answers; the component draws the table from them and the runner builds the live
plan's `["match", ["get","iso_a2"], …]` expressions from the same array.
`assertClassingReachesTheLayers` then reads the WRITTEN page back and holds the plan's expressions
against the same index the markup carries — rebuilding what each country should wear from the index
and this ramp rather than from the object the plan was built out of, because comparing a variable
with itself is not a check. A mutation that gave one country the wrong class in the plan alone passed
the first version of that guard, green.

The land the ramp is anchored on is the same colour in both layers, and that too is asserted rather
than assumed: the plate records the two tints it was baked in, the live style is repainted with those
same two, and `assertLiveStyleAnswered` refuses a sweep that matched nothing.

## The one country with no reading

Ukraine has no published 2024 production, so it is drawn hollow: no fill of its own, the plate's own
land showing through, a dotted edge so it cannot be read as a country outside the frame, and its own
name in the legend. It still ANSWERS: a hollow country is a line, and a line answers a pointer only
within a pixel or two of its stroke, so an invisible fill carries its hit area — measured by driving
a pointer into the middle of Ukraine and getting the previous country's answer back. It is handed to no rule as a number it is not, and it is never dropped into the
lowest class — the lowest class is a reading, and Ukraine has none.

## Everything else is a step off the ground

The axis labels, the legend's words, the country edges, the source line: all computed by
`deriveFurniture` from the direction's own ground at render time, never written here as a literal.
The country edge is additionally lifted to 1,6:1 against the land, because an edge no one can see
turns forty shapes into one.
