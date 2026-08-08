---
id: chord
engines:
  chart-native: chord
intent: [flow]
shape: flow
limits: {}
# NO `limits` HERE, AND THAT IS THE MEASURED ANSWER, NOT AN OVERSIGHT. `limits` is a CLOSED set
# of keys, each measurable from lib/brain/facts.ts, and `maxCategories` compares the CSV's ROW
# COUNT (facts.rows → eligibility.ts's limitFailure). On a link list a row is a LINK, not an
# entity — so this sheet's inherited `maxCategories: 8` did not mean "8 entities", it meant "8
# links", and it refused the type's own proof spec (four districts, ten movements between them)
# the moment the sheet became renderable. Measured, not assumed.
# The real caps ARE enforced, on the right quantity and in the two places that can count it:
# the mapper refuses past CHORD_MAX_ENTITIES distinct entities BY NAME (flow-links.ts), and
# checkChordConformance refuses the same on the matrix that renders.
# A cap stated in the wrong unit is worse than no cap: it reads correct and excludes the
# wrong charts.
formats: [static, interactive, video]
bestFor:
  - "exchange WITHIN one set — the same entities both send and receive (moves between districts, trade between regions, transfers between clubs) and the big bilateral links are the story"
  - "a small set, up to 8 entities, where each one's total and its biggest partner are what the reader should take away"
notFor:
  - "a directed source-to-destination pipeline through stages — nothing in the table flows BOTH ways, and the form is refused by name; that is a Sankey"
  - "a network of relationships between things that do not exchange a quantity — this engine does not draw networks; an arc diagram lays links along ONE ordered axis, which is a different claim"
  - "many entities or a dense matrix — the ribbons become an unreadable knot; aggregate the tail into an 'Other'"
  - "precise comparison — ribbon widths are read approximately; label the big ones"
---

# Chord diagram — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "flow" chord · Circos/d3-chord (the form) · data-to-viz.com
> (the chord — and its readability caveats). credited.
> Inherits: `global/dataviz.md` (L0). A circular flow-matrix layout.

A chord diagram lays entities around a circle and draws **ribbons between them whose thickness is the
flow** — a square matrix of who-connects-to-whom. It answers **"what flows between these few entities,
and which links dominate"**: migration between districts, transfers, trade, co-occurrence.

## The data it takes — the SAME link list a Sankey takes

```
source,target,value
Riverside,Hillcrest,32
Hillcrest,Riverside,30
Eastgate,Northbank,18
```

Exactly three columns, matched **by name**, in any order, in any of the four languages —
`source,target,value` · `source,cible,valeur` · `quelle,ziel,wert` · `origine,destinazione,valore`.
Any other header is refused, naming what was expected.

**Not a matrix.** The circle is drawn from an N×N matrix, and asking a journalist for one would have
been the shorter path — but a newsroom does not hold a matrix, it holds a register export with one row
per movement. Handing over the transposition (the step where a flow silently reverses direction) is not
a service. The matrix is derived here, from the link list, where a test pins which way round it goes.

Both directions of a pair are separate rows (`A → B` and `B → A`), which is exactly the point of the
form: an exchange is two flows, and the ribbon shows both ends. The **order** of the entities around the
ring is derived — largest total first, ties broken by the order your rows name them — and it is stable:
the same CSV always yields the same circle.

## When to use / when NOT — read the caveats first

- **Use** for: exchange within ONE set, where the entities both send and receive, and the big bilateral
  links are the story. Each entity's arc = its total; each ribbon = a pair's flow.
- **Not** for: a directed source→destination pipeline through stages — that's a **Sankey**, and it is
  refused by name. The test is mechanical and is the exact MIRROR of the sankey's: a sankey refuses a
  cycle because its columns are stages, and a chord REQUIRES one, because a ring of things that never
  send anything back to each other is not an exchange — every quantity moves strictly forward, which is
  a staged flow wearing a circle. Drawn as a chord it puts origins and destinations side by side on one
  ring as if they were peers, inventing a symmetry the data never had. (Asking instead whether any
  entity both SENDS and RECEIVES does not separate the two forms: a hub passes that trivially, and the
  five-sources-one-grid-five-uses energy table sailed straight through it. Measured, then corrected.)
- **Not** for: a NETWORK of relationships that are not an exchanged quantity. **This engine does not
  draw networks.** The **arc diagram** is the nearest form, and it makes a different claim: links along
  ONE ordered axis, where the order is the editorial choice.
- **Not** for: many entities or a dense matrix — past 8 the ribbons knot; **refused by name**, with
  aggregation into an "Other" as the repair.
- **Not** for: precise comparison — ribbon widths are read approximately; label the big ones.

## Correctness "de base" (chord-specific)

1. **Each entity's arc length ∝ its total flow**; each ribbon's end width ∝ that directed flow. →
   `checkChordConformance` (a square matrix, non-negative).
2. **Few entities, ≤ 8**, each an Okabe-Ito hue; colour ribbons by one endpoint (usually the larger /
   the source).
3. **Label every arc** (outside the ring) and quote the headline flow; a note says what a ribbon means.
4. **The ring is one set exchanging with itself.** Something must flow BOTH ways — checked at the gate
   on the link list (`flowCycle`) and again at produce on the matrix that renders.
5. **Order entities deliberately** (size, here) and keep the order fixed — derived, never random.

## data-to-viz caveats (credited)

- A chord is beautiful but **hard to read precisely** and crowds fast — keep the entity count tiny,
  aggregate the long tail, and always label the dominant links; never ask readers to compare thin
  ribbons across the circle.

## Motion grammar (how a chord *builds*)

See `formats/video.md`; the gesture:

- the whole figure **blooms from the centre** (scales up) as the arcs fade in; each ribbon fades in,
  staggered; the arc labels fade in last.
The arcs/ribbons are fixed by the layout; only scale/opacity animate, so frame N is a pure function of
the frame. The walk it carries is **sequenced**: the stagger advances by RIBBON — a pair of entities —
and a beat anchors on a single named row, so the sentences follow one another over the animation in the
order written.
