---
id: sankey
engines: {}
unreachable: "chart-native has no MAPPERS entry for sankey (deferred: \"family-B: needs nodes+links\", native-types.ts) — no spec can reach it today"
intent: [flow]
shape: structural
limits: {}
formats: [static, interactive, video]
bestFor:
  - "a flow with a handful of nodes per stage and 2-4 stages, where the size of each path is the story — proportions splitting and merging"
notFor:
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

## When to use / when NOT — read the caveats first

- **Use** for: a flow with a handful of nodes per stage and 2–4 stages, where the SIZE of each path is
  the story — proportions splitting and merging.
- **Not** for: many nodes / dense many-to-many links — the ribbons tangle into spaghetti; aggregate
  small flows into an "Other".
- **Not** for: precise comparison of two ribbons far apart — thickness is read approximately; label the
  values.
- **Not** for: flows that don't conserve (a stage that invents or loses quantity unexplained) — show the
  loss as its own node ("Losses") so the books balance.

## Correctness "de base" (sankey-specific)

1. **Link THICKNESS ∝ value**, on one shared scale, so a node's height = the total flowing through it. →
   `checkSankeyConformance` (every link value > 0; valid source/target; ≥ 2 columns).
2. **Conserve flow**: what enters a node leaves it (or is shown as an explicit loss node). Don't drop
   quantity silently.
3. **Label every node** (and its total); label the big ribbons' values, the rest on hover.
4. **Order nodes + links to minimise crossings**; colour links by their source (Okabe-Ito, ≤ ~6) or keep
   them neutral, with solid node bars.

## data-to-viz caveats (credited)

- A Sankey is seductive but **crowds fast**: keep the node count low and aggregate the long tail, or the
  ribbons become unreadable. Thickness encodes value poorly for thin/distant ribbons — always label.

## Motion grammar (how a Sankey *builds*)

See `formats/video.md`; the gesture:

- the node bars grow in column by column (left → right), staggered;
- each link ribbon **fades + widens in** once both its endpoints have landed; node/value labels fade last.
A ribbon's path is fixed by the layout; only its opacity/width animates, so frame N is a pure function of
the frame.
