---
id: arc
engines:
  chart-native: arc
intent: [flow]
shape: flow
limits: {}
# NO `limits` HERE, AND THAT IS THE MEASURED ANSWER, NOT AN OVERSIGHT. `limits` is a CLOSED set
# of keys, each measurable from lib/brain/facts.ts, and `maxCategories` compares the CSV's ROW
# COUNT (facts.rows → eligibility.ts's limitFailure). On a link list a row is a LINK, not an
# entity — so a `maxCategories: 14` here would not mean "14 nodes on the baseline", it would
# mean "14 rows", and a six-party arc with fifteen co-signatures between them would be refused
# for being too crowded to label when it is not. Measured on chord's twin, not assumed.
# The real caps ARE enforced, on the right quantity and in the two places that can count it:
# the mapper refuses past ARC_MAX_NODES distinct nodes BY NAME (flow-links.ts), and
# a shared, MEASURED label-fit check (arc-geometry's `arcLabelFit`) refuses a baseline too
# crowded to name — read off the layout the component draws, which is the only place the real
# question (does the longest name still fit?) exists, at the gate and again at produce.
# A cap stated in the wrong unit is worse than no cap: it reads correct and excludes the
# wrong charts.
formats: [static, interactive, video]
bestFor:
  - "relationships along ONE ordered axis, where the order is itself editorial — parties left to right, stations along a line, years in sequence — and which pairs connect ACROSS that order is the story"
  - "a handful of named things (up to 14) linked in pairs, where a link's weight matters but its direction does not"
notFor:
  - "a network whose STRUCTURE is the story — clusters, hubs, distance between things. This engine does not draw networks: an arc diagram fixes the nodes on a line you choose, so it shows which pairs connect, never how the graph is shaped"
  - "a quantity moving through stages — nothing here conserves or accumulates; that is a Sankey"
  - "an exchange where both directions matter — an arc is one mark for a pair, so A→B and B→A collapse; that is a chord"
  - "an order that means nothing — if the axis is arbitrary the arcs are arbitrary, and the reader will read meaning into the sequence anyway"
  - "a self-link — an arc is drawn between two positions on the baseline, so a link from a node to itself has no width and would simply vanish; refused by name"
---

# Arc diagram — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "flow" arc/network forms · data-to-viz.com (the arc
> diagram — and its "node order is everything" caveat) · Wattenberg, "Arc Diagrams: Visualizing
> Structure in Strings" (InfoVis 2002, the form's origin: repetition made visible by placing the
> sequence on one axis). credited.
> Inherits: `global/dataviz.md` (L0). Nodes on one baseline, links as half-ellipses above it.

An arc diagram puts every node on **one horizontal line** and draws each relationship as an **arc rising
above it**. Link weight → the arc's stroke width; a node's total incident weight → its dot's area. It
answers **"which of these, in this order, are connected — and how strongly"**.

## Read this first: it is not a network drawing

**This engine does not draw networks.** A network diagram places nodes to express STRUCTURE — clusters
near each other, hubs in the middle, distance meaning something. An arc diagram gives that up entirely:
the nodes sit where the axis puts them, and the only thing left is which pairs connect and how heavily.
That is a real, honest form — Wattenberg's original point was that a fixed sequence makes repetition
visible — but it answers a smaller question than a network layout, and it answers it *only when the
order along the axis carries meaning*. If the order is arbitrary, so is everything the reader will
infer from it.

## The data it takes — the SAME link list the flow family shares

```
source,target,value
Green Alliance,Workers' Party,14
Workers' Party,Social Democrats,9
Social Democrats,Liberals,18
```

Exactly three columns, matched **by name**, in any order, in any of the four languages —
`source,target,value` · `source,cible,valeur` · `quelle,ziel,wert` · `origine,destinazione,valore`.
Any other header is refused, naming what was expected.

**The order along the baseline is your rows' order.** It is the one editorial choice this form lives or
dies by, and it is taken from the only place you can state it without a new field: the order in which
your rows first name each node, left to right. Reorder your spreadsheet and you reorder the axis.
Deriving it from the data instead — biggest first, say — would turn the axis into a ranking, which is a
second encoding nobody asked for and which scatters the neighbours your story may want adjacent.

Direction is **not** drawn: `A → B` and `B → A` are the same arc. If both directions matter, use a
**chord**.

## When to use / when NOT

- **Use** for: relationships along an order that is itself editorial — a political spectrum, stops on a
  line, a chronology — where the interesting thing is which pairs reach ACROSS it.
- **Not** for: a network whose structure is the story (see above).
- **Not** for: a quantity moving through stages — nothing accumulates or conserves here; that is a
  **Sankey**.
- **Not** for: an exchange where direction matters — that is a **chord**.
- **Not** for: an arbitrary order. The reader will read the sequence as meaningful whether or not it is.
- **Not** for: a self-link. It has no width on a baseline and would vanish silently, so it is **refused
  by name**.

## Correctness "de base" (arc-specific)

1. **Weight → stroke width, and nothing else.** An arc's HEIGHT is not an encoding — it is a function of
   how far apart its two nodes are — and the geometry scales every arc by one shared vertical factor and
   caps the tallest, so a wide link cannot escape the plot. → `checkArcConformance`.
2. **A node's dot scales by AREA** (r ∝ √degree), never by radius: radius-scaling exaggerates a big hub
   by the square.
3. **The nodes must still be NAMES.** Each label is truncated to the gap between its node and its
   neighbour, so a crowded baseline does not overflow — it quietly turns every name into an ellipsis,
   and a network of unnamed nodes says nothing. Two rules, and the second is the one that bites:
   a hard ceiling of **14 nodes**, and a MEASURED check on the baseline the component will draw,
   refusing when the longest label loses more than half its width. The measured one depends on YOUR
   names — fourteen party abbreviations are fine, ten "Sozialdemokratische Partei"s are not — and
   both are refused **at the gate**, while you can still change the table, then re-measured at
   produce on the artifact through the same function.
4. **One order, stated and kept.** Derived from your rows, stable across runs.

## data-to-viz caveats (credited)

- The arc diagram's readability "**depends heavily on the node order**": the same links, reordered, look
  like a different structure. Choose the order for a reason you can state in the caption.
- It is a **poor choice for dense graphs** — beyond a few dozen links the arcs overlap into a band.
  Aggregate, or accept that only the heaviest links will read.

## Motion grammar (how an arc diagram *builds*)

See `formats/video.md`; the gesture:

- the baseline and the node dots enter left to right, staggered;
- every arc then **sweeps open from its left foot** on one shared progress, so the network assembles as
  a single movement rather than link by link.
The arcs are fixed by the layout and only their sweep animates, so frame N is a pure function of the
frame. The walk it carries is **sequenced**: the dots enter one by one, but the arcs — the relationships
that are the point — all sweep together, and a beat anchors on a single named row rather than on a pair.
