---
takeaway: "Eight recorded routes carried 54500 people out of Portugal in 2025. The heaviest single route is Lisboa to London, but the city that draws the most across several routes is Paris."
grounding: supported
reference: "Sabrina Weiss (text) and David Bauer (graphics) -- Republik -- 'Mensch gesund, Klima krank? Die Schattenseite der Pharmaindustrie' (21 March 2025), reporting with SRF Data. Argument structure: a total whose majority escapes the subject named in the title. Two moves lifted: the named subject keeps its mark at the same scale as everything it is compared against (Lisboa-London stays the widest ribbon, it is not recoloured or pulled out), and the quantity the graphic cannot place is EXCLUDED and DECLARED in the source note rather than folded in (here: the return flows, recorded separately and absent from this extract)."
subject: "Lisboa to London, the heaviest single route, read against Paris, the destination that draws the most"
comparison: "each route's volume against every other route's, as the width of one ribbon on one linear scale, and the five destinations against each other as the sum of the ribbons arriving at them"
limits: "return flows are recorded separately and are NOT in this extract, so nothing here is a net figure and no arrow may be read as a balance. Eight routes only -- the article says they account for most recorded emigration in 2025, not all of it, and the unrecorded remainder has no size in this file. Every route in the extract starts in Portugal, so the map shows an outward fan and not a European migration system. Origin and destination are city points; the extract carries no path between them, so the ribbons are drawn as connections, never as itineraries -- no territory a ribbon passes over is a place anybody is recorded as having crossed."
placement: "in the article body, full width, replacing the paragraph's own list of route figures"
credit: "recorded emigration register, 2025 extract"
effectiveDate: "2026-08-21"
language: "en"
slots:
  - id: 1
    proves: "that the eight recorded routes fan out of Portugal to five European cities, that Lisboa-London is the widest single one, and that Paris nevertheless takes more people than London once its three routes are added up"
    medium: map
    format: web
    reachable: yes
    candidates: ["Flow map (route)", "Proportional symbol (symbol / bubble map)"]
    chosen: "Flow map (route)"
---

## What the visual shows

A live map of the western half of Europe, on the newsroom's charcoal ground over a dark basemap.
Eight gold ribbons leave six Portuguese cities and arrive at five European ones. Each ribbon's
WIDTH is its volume on one linear scale, so Lisboa-London is nine and a half times the width of
Aveiro-Paris because it is nine and a half times the number of people. A ribbon carries a small
arrowhead at the city it arrives at: this data has a direction, and a line without one would let a
reader read a link where the extract records a departure.

Hovering, tapping or tabbing to any ribbon gives that route's own two cities, its exact figure and
its share of the eight. The five destinations carry the same treatment with their own arriving
total, which is where the second half of the takeaway lives -- Paris 23600 against London 21200 --
because it is a number that exists only when you add ribbons together and no single ribbon can show
it. Both readings are also in a collapsed table under the map, in the same order, for a reader with
no spatial access to the picture.

## Why a flow map and not a proportional symbol map

The article's own claim names PAIRS: "Lisbon to London, 18,400; Lisbon to Paris, 12,100". A
proportional symbol map can draw the five destinations, or the six origins, but not the eight
pairs -- it would have to choose one end and silently drop the other, which is the claim. The other
half of the takeaway (Paris draws more than London) is exactly what a symbol map is good at, and
that is why it is the second candidate rather than a straw one: it survives as the destination
marks inside this beat, layered on the flow map rather than replacing it.

## What the flow-map sheet refuses, and why this beat is drawn anyway

`map-beat/references/types/flow-map.md` is explicit that a route map is "a SINGLE path with the
territories it crosses, not a many-to-many flow", and that many origin-destination pairs on this
type produce "a tangle of overlapping accent-coloured lines". It names the type that should be used
instead -- "an OD flow diagram, not a route map" -- and this toolchain holds no sheet for one. So
this slot is a flow map by the survey's own vocabulary and an OD flow map by the sheet's, and the
composition answers the refusal head on rather than ignoring it: eight ribbons, not hundreds; one
accent at eight widths rather than eight hues; a consistent one-sided bow so ribbons sharing an
endpoint separate before they reach it; opaque strokes drawn widest-first with a ground-coloured
casing, so a crossing reads as one ribbon passing over another and never as a third, darker value.
The tangle the sheet warns about is a real failure mode at this count minus the four decisions
above; it is stated in the beat's own brief so the next person can check whether they still hold.
