---
id: sankey
engines:
  chart-native: sankey
intent: [flow]
shape: flow
limits: {}
formats: [static, interactive, video]
bestFor:
  - "a quantity moving THROUGH STAGES — a budget, an energy mix, a migration, a funnel — where the size of each path is the story and proportions split and merge"
  - "a flow with a handful of nodes per stage and 2-4 stages, whose books balance: what enters a stage leaves it"
notFor:
  - "a flow that goes BOTH WAYS between the same entities — a Sankey's columns are stages, so a cycle has no stage order and is refused by name; that is a chord"
  - "a network of relationships with no direction and no stages — this engine does not draw networks; an arc diagram is the nearest it has, and it draws links along ONE ordered axis, not a graph"
  - "many nodes / dense many-to-many links — the ribbons tangle into spaghetti; aggregate small flows into an 'Other'"
  - "precise comparison of two ribbons far apart — thickness is read approximately; label the values"
  - "flows that don't conserve — a stage that invents or loses quantity unexplained; show the loss as its own node so the books balance"
---

# Sankey / flow diagram — per-type best practice (L2)

> Sources: FT Visual Vocabulary (the canon) — "flow" Sankey · data-to-viz.com (the Sankey — and its
> "few nodes" caveat) · Sankey/Schmidt (flow conservation). credited.
> Inherits: `global/dataviz.md` (L0). A left→right flow layout (nodes in columns, links as ribbons).

A Sankey shows **how a quantity FLOWS** from sources to destinations through stages: nodes are stacked in
columns, links are ribbons whose **THICKNESS is proportional to the value** that flows along them. It
answers **"where does it come from, where does it go, and how much through each path"** — a budget, an
energy mix, a migration, a customer funnel.

## The data it takes — a LINK LIST, one row per link

```
source,target,value
Wind,National grid,38
Gas,National grid,30
National grid,Homes,40
```

Exactly three columns, matched **by name**, in any order. The names may be written in any of the four
languages Splash serves — `source,target,value` · `source,cible,valeur` · `quelle,ziel,wert` ·
`origine,destinazione,valore` — and **any other header is refused, naming what was expected**. Nothing
is read positionally: a link list has two text columns whose meaning is not symmetric, swapping them
reverses every flow in the picture, and the picture still looks right. There is no property of the data
that could tell them apart, so the engine never guesses.

A fourth column is refused too, even a harmless-looking one. A `year` beside a pair is the dimension
that makes the same pair appear twice, and summing or dropping it would silently double or lose a
flow — aggregate it away first, or split the chart.

**Everything else is DERIVED from that table, and derived the same way every time**: which nodes exist
(the names in the two columns, first appearance first), which STAGE each node sits in (a node with no
incoming link is stage 0; every other node sits one past the LONGEST path reaching it, so a ribbon never
doubles back), the vertical order within a stage (largest flow first), and the colours (the first
stage's nodes take the Okabe-Ito ramp so a ribbon is traceable by its origin; past six origins the whole
diagram goes neutral rather than repeating a hue). Two runs of the same CSV give the same picture.

## When to use / when NOT — read the caveats first

- **Use** for: a quantity moving through stages, where the SIZE of each path is the story — proportions
  splitting and merging.
- **Not** for: a flow that goes BOTH WAYS. A Sankey's columns are stages and every link points forward;
  a cycle (`A → B → A`, or a node linking to itself) has no stage order, so it is **refused by name**
  with the pair printed. The repair is either to split the looping node into its two roles ("Storage
  in" / "Storage out") or to use a **chord**, which is built for two-way exchange.
- **Not** for: a NETWORK — a set of things related to one another with no direction and no stages.
  **This engine does not draw networks.** The nearest form it has is the **arc diagram**, and that is
  not a network drawing either: it lays the nodes on ONE ordered axis and arcs the links over them, so
  it works when the order is meaningful and fails when the structure is.
- **Not** for: many nodes / dense many-to-many links — the ribbons tangle into spaghetti; aggregate
  small flows into an "Other".
- **Not** for: precise comparison of two ribbons far apart — thickness is read approximately; label the
  values.
- **Not** for: flows that don't conserve (a stage that invents or loses quantity unexplained) — show the
  loss as its own node ("Losses") so the books balance. This one is **enforced**, see below.

## Correctness "de base" (sankey-specific)

1. **Link THICKNESS ∝ value**, on one shared scale, so a node's height = the total flowing through it. →
   `checkSankeyConformance` (every link value > 0; valid source/target; ≥ 2 columns).
2. **Conserve flow**: what enters a node leaves it, or is shown as an explicit loss node. This is the one
   Sankey rule a rendered picture cannot show you is broken — the geometry draws a stage at
   max(in, out), so a stage losing a fifth of its quantity renders as a perfectly solid bar with thinner
   ribbons on one side and the loss is simply invisible. So it is **refused**, at the gate and again at
   produce, naming the stage and both totals (tolerance: half a percent, because real flow tables are
   rounded and an exact rule would refuse honest data over a crumb).
3. **Label every node** (and its total); label the big ribbons' values, the rest on hover.
4. **Order nodes + links to minimise crossings**; colour links by their source (Okabe-Ito, ≤ 6) or keep
   them neutral, with solid node bars.

## data-to-viz caveats (credited)

- A Sankey is seductive but **crowds fast**: keep the node count low and aggregate the long tail, or the
  ribbons become unreadable. Thickness encodes value poorly for thin/distant ribbons — always label.

## Motion grammar (how a Sankey *builds*)

See `formats/video.md`; the gesture:

- the node bars grow in column by column (left → right), staggered;
- each link ribbon **fades + widens in** once both its endpoints have landed; node/value labels fade last.
A ribbon's path is fixed by the layout; only its opacity/width animates, so frame N is a pure function of
the frame. The walk it carries is **sequenced**, not anchored: the subject of a flow diagram is a LINK —
a pair of nodes — and a beat anchors on a single named row, so the sentences follow one another over the
animation in the order written.
